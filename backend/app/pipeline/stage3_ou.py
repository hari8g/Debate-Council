"""Ornstein-Uhlenbeck parameter estimation with calendar time and structured coupling."""

from __future__ import annotations

import numpy as np
from scipy.linalg import expm, logm

from app.models.stage1 import DerivedSignals
from app.models.stage3 import OuParameters, PhasePortrait, PhasePortraitSlice
from app.pipeline.stage3_state import INPUT_LABELS, STATE_DIM, build_external_inputs

STATE_LABELS = ["Valence", "Arousal", "Stability", "Connectivity", "Engagement", "Ideological"]
SLICE_PAIRS = [(0, 1), (2, 4), (3, 5)]


def _half_life(alpha_diag: float) -> float:
    if alpha_diag < 1e-6:
        return float("inf")
    return float(np.log(2) / alpha_diag)


def _project_stable_alpha(alpha: np.ndarray) -> np.ndarray:
    """Ensure real parts of eigenvalues are positive (mean reversion)."""
    try:
        eigvals, eigvecs = np.linalg.eig(alpha)
        eigvals = np.real(eigvals)
        eigvals = np.maximum(eigvals, 0.05)
        alpha_proj = np.real(eigvecs @ np.diag(eigvals) @ np.linalg.inv(eigvecs))
        return np.clip(alpha_proj, -5, 10)
    except Exception:
        return np.maximum(np.diag(np.diag(alpha)), 0.05) * np.eye(STATE_DIM)


def _fit_diagonal_variable_dt(
    X: np.ndarray,
    Y: np.ndarray,
    dt: np.ndarray,
) -> tuple[np.ndarray, np.ndarray, list[float]]:
    D = X.shape[1]
    alpha = np.zeros((D, D))
    a_diag = np.zeros(D)
    per_r2: list[float] = []

    for d in range(D):
        x_d = X[:, d]
        y_d = Y[:, d]
        if np.var(x_d) < 1e-10:
            a_dd = 0.92
        else:
            phi_list = []
            for k in range(len(x_d)):
                if abs(x_d[k]) > 1e-8:
                    phi_list.append(y_d[k] / x_d[k])
            a_dd = float(np.clip(np.median(phi_list) if phi_list else 0.9, 0.01, 0.999))
        a_diag[d] = a_dd
        mean_dt = float(np.mean(dt)) if len(dt) else 1.0
        alpha[d, d] = float(np.clip(-np.log(max(a_dd, 1e-6)) / max(mean_dt, 0.25), 0.05, 10.0))
        pred = a_dd * x_d
        ss_res = float(np.sum((y_d - pred) ** 2))
        ss_tot = float(np.sum((y_d - np.mean(y_d)) ** 2))
        per_r2.append(float(1 - ss_res / (ss_tot + 1e-6)))

    return alpha, a_diag, per_r2


def _fit_block_coupling(alpha: np.ndarray, X: np.ndarray, Y: np.ndarray, dt: np.ndarray) -> np.ndarray:
    """Add off-diagonal coupling within (valence, arousal) and (stability, engagement) blocks."""
    mean_dt = float(np.mean(dt)) if len(dt) else 1.0
    blocks = [(0, 1), (2, 4)]
    alpha = alpha.copy()
    for i, j in blocks:
        xi, yi = X[:, i], Y[:, i]
        xj, yj = X[:, j], Y[:, j]
        if np.var(xj) > 1e-8:
            cross_i = float(np.clip(np.mean(yi * xj) / (np.mean(xj ** 2) + 1e-8), -0.3, 0.3))
            alpha[i, j] = float(np.clip(-np.log(max(0.5, 1 - abs(cross_i))) / mean_dt, 0, 2.0)) * np.sign(cross_i)
        if np.var(xi) > 1e-8:
            cross_j = float(np.clip(np.mean(yj * xi) / (np.mean(xi ** 2) + 1e-8), -0.3, 0.3))
            alpha[j, i] = float(np.clip(-np.log(max(0.5, 1 - abs(cross_j))) / mean_dt, 0, 2.0)) * np.sign(cross_j)
    return alpha


def _fit_full_matrix_ou(
    X: np.ndarray,
    Y: np.ndarray,
    dt: np.ndarray,
    ridge: float = 0.05,
) -> tuple[np.ndarray, np.ndarray, list[float]]:
    mean_dt = float(np.mean(dt)) if len(dt) else 1.0
    XtX = X.T @ X + ridge * np.eye(X.shape[1])
    A_T = np.linalg.solve(XtX, X.T @ Y)
    A = A_T.T
    A = np.clip(A, -0.99, 0.99)
    try:
        alpha = -np.real(logm(A)) / mean_dt
        alpha = _project_stable_alpha(alpha)
    except Exception:
        alpha = -np.log(np.maximum(np.diag(A), 0.01)) / mean_dt * np.eye(STATE_DIM)
    residuals = Y - X @ A_T
    per_r2 = []
    for d in range(STATE_DIM):
        ss_res = float(np.sum(residuals[:, d] ** 2))
        ss_tot = float(np.sum((Y[:, d] - np.mean(Y[:, d])) ** 2))
        per_r2.append(float(1 - ss_res / (ss_tot + 1e-6)))
    return alpha, A, per_r2


def _estimate_input_matrix(
    residuals: np.ndarray,
    U: np.ndarray,
) -> tuple[np.ndarray, np.ndarray]:
    if U.shape[0] != residuals.shape[0] or U.shape[0] < 3:
        return np.zeros((STATE_DIM, len(INPUT_LABELS))), np.mean(U, axis=0) if len(U) else np.zeros(len(INPUT_LABELS))
    mean_u = np.mean(U, axis=0)
    Uc = U - mean_u
    B_T = np.linalg.lstsq(Uc, residuals, rcond=None)[0]
    B = np.clip(B_T.T, -0.5, 0.5)
    return B, mean_u


def _model_score_ar1(per_r2: list[float]) -> float:
    return float(np.mean(per_r2)) if per_r2 else 0.0


def estimate_ou_parameters(
    state_history: np.ndarray,
    dt_days: np.ndarray,
    derived: DerivedSignals,
) -> OuParameters:
    T, D = state_history.shape
    if T < 3:
        x_star = np.mean(state_history, axis=0) if T > 0 else np.zeros(D)
        return OuParameters(
            alpha=np.eye(D).tolist(),
            x_star=x_star.tolist(),
            sigma=[0.1] * D,
            r_squared=0.0,
            state_history=state_history.tolist(),
            fit_method="insufficient_data",
            n_observations=T,
            mean_dt_days=float(np.mean(dt_days)) if len(dt_days) else 7.0,
            input_labels=INPUT_LABELS,
        )

    x_star = np.mean(state_history, axis=0)
    X = state_history[:-1] - x_star
    Y = state_history[1:] - x_star
    dt = dt_days if len(dt_days) == len(X) else np.full(len(X), float(np.mean(dt_days)) if len(dt_days) else 1.0)

    alpha_diag, a_diag, per_r2_diag = _fit_diagonal_variable_dt(X, Y, dt)
    alpha_block = _fit_block_coupling(alpha_diag, X, Y, dt)

    fit_method = "block_diagonal_calendar"
    alpha = alpha_block
    per_r2 = per_r2_diag

    if T >= 40:
        alpha_full, A_full, per_r2_full = _fit_full_matrix_ou(X, Y, dt)
        score_diag = _model_score_ar1(per_r2_diag)
        score_full = _model_score_ar1(per_r2_full)
        if score_full >= score_diag - 0.05:
            alpha = alpha_full
            per_r2 = per_r2_full
            fit_method = "full_matrix_calendar"

    a_matrix = np.diag(a_diag)
    y_pred = X @ a_matrix.T
    if fit_method == "full_matrix_calendar":
        y_pred = X @ np.linalg.lstsq(X, Y, rcond=None)[0].T

    residuals = Y - y_pred
    U = build_external_inputs(derived, len(X))
    B, mean_u = _estimate_input_matrix(residuals, U)
    sigma = np.maximum(np.std(residuals, axis=0), 0.01)

    ss_res = float(np.sum(residuals ** 2))
    ss_tot = float(np.sum((Y - np.mean(Y, axis=0)) ** 2))
    r2 = float(1 - ss_res / (ss_tot + 1e-6))

    half_lives = [_half_life(float(alpha[d, d])) for d in range(D)]

    rw_score = _model_score_ar1(per_r2_diag)

    return OuParameters(
        alpha=alpha.tolist(),
        x_star=x_star.tolist(),
        sigma=sigma.tolist(),
        r_squared=r2,
        state_history=state_history.tolist(),
        fit_method=fit_method,
        n_observations=T,
        input_matrix_b=B.tolist(),
        input_labels=INPUT_LABELS,
        mean_input=mean_u.tolist(),
        dt_days_series=dt.tolist(),
        mean_dt_days=float(np.mean(dt)),
        calendar_span_days=float(np.sum(dt)),
        per_dimension_r2=per_r2,
        half_lives_days=half_lives,
        model_scores={"diagonal_ar1": rw_score, "selected": r2},
    )


def _detect_cyclicality(history: np.ndarray, dim: int = 0) -> tuple[float, bool]:
    series = history[:, dim]
    if len(series) < 8 or np.std(series) < 1e-6:
        return 0.0, False
    lag = max(2, len(series) // 4)
    ac = float(np.corrcoef(series[:-lag], series[lag:])[0, 1])
    score = float(np.clip(-ac, 0, 1)) if ac < 0 else float(np.clip(ac * 0.3, 0, 0.4))
    return score, ac < -0.25


def _compute_slice(
    ou: OuParameters,
    dims: tuple[int, int],
    history: np.ndarray,
) -> PhasePortraitSlice:
    alpha = np.array(ou.alpha)
    x_star = np.array(ou.x_star)
    d1, d2 = dims

    if d1 == 0:
        v_range = np.linspace(-1, 1, 20)
    else:
        v_range = np.linspace(0, 1, 20)
    if d2 == 0:
        a_range = np.linspace(-1, 1, 20)
    else:
        a_range = np.linspace(0, 1, 20)

    V, A = np.meshgrid(v_range, a_range)
    dV = np.zeros_like(V)
    dA = np.zeros_like(A)

    for i in range(V.shape[0]):
        for j in range(V.shape[1]):
            x_current = x_star.copy()
            x_current[d1] = V[i, j]
            x_current[d2] = A[i, j]
            dx_dt = -alpha @ (x_current - x_star)
            dV[i, j] = dx_dt[d1]
            dA[i, j] = dx_dt[d2]

    traj = history[:, [d1, d2]].tolist() if len(history) > 0 else []
    av, aa = float(alpha[d1, d1]), float(alpha[d2, d2])
    jac = np.array([[alpha[d1, d1], alpha[d1, d2]], [alpha[d2, d1], alpha[d2, d2]]])
    eigvals = np.real(np.linalg.eigvals(jac))
    fixed_type = "stable_node" if np.all(eigvals > 0) else "saddle" if np.any(eigvals < 0) else "center"

    return PhasePortraitSlice(
        dim1=d1,
        dim2=d2,
        dim1_label=STATE_LABELS[d1],
        dim2_label=STATE_LABELS[d2],
        v_grid=V.tolist(),
        a_grid=A.tolist(),
        dv=dV.tolist(),
        da=dA.tolist(),
        equilibrium_v=float(x_star[d1]),
        equilibrium_a=float(x_star[d2]),
        mean_reversion_rate_v=av,
        mean_reversion_rate_a=aa,
        historical_trajectory=traj,
        fixed_point_type=fixed_type,
        half_life_v_days=_half_life(av),
        half_life_a_days=_half_life(aa),
    )


def compute_phase_portrait(ou: OuParameters, dims: tuple[int, int] = (0, 1)) -> PhasePortrait:
    history = np.array(ou.state_history) if ou.state_history else np.zeros((0, STATE_DIM))
    primary = _compute_slice(ou, dims, history)
    slices = [primary] + [_compute_slice(ou, p, history) for p in SLICE_PAIRS if p != dims]
    cyc_score, cyc = _detect_cyclicality(history)

    return PhasePortrait(
        v_grid=primary.v_grid,
        a_grid=primary.a_grid,
        dv=primary.dv,
        da=primary.da,
        equilibrium_v=primary.equilibrium_v,
        equilibrium_a=primary.equilibrium_a,
        mean_reversion_rate_v=primary.mean_reversion_rate_v,
        mean_reversion_rate_a=primary.mean_reversion_rate_a,
        historical_trajectory=primary.historical_trajectory,
        slices=slices,
        cyclicality_score=cyc_score,
        cyclicality_detected=cyc,
        fixed_point_type=primary.fixed_point_type,
    )


def ou_exact_step(
    x: np.ndarray,
    x_star: np.ndarray,
    alpha: np.ndarray,
    sigma: np.ndarray,
    dt: float,
    B: np.ndarray,
    u: np.ndarray,
    rng: np.random.Generator,
) -> np.ndarray:
    phi = expm(-alpha * dt)
    alpha_diag = np.clip(np.diag(alpha), 0.05, 10.0)
    var = np.where(
        alpha_diag > 1e-6,
        (sigma ** 2 / (2 * alpha_diag)) * (1 - np.exp(-2 * alpha_diag * dt)),
        (sigma ** 2) * dt,
    )
    noise = rng.normal(0, 1, len(x)) * np.sqrt(np.maximum(var, 1e-10))
    drift = B @ (u - np.zeros(len(u))) if B.size else 0
    if isinstance(drift, np.ndarray):
        external = drift * dt
    else:
        external = 0
    x_new = x_star + phi @ (x - x_star) + external + noise
    x_new[0] = float(np.clip(x_new[0], -1, 1))
    x_new[1:] = np.clip(x_new[1:], 0, 1)
    return x_new
