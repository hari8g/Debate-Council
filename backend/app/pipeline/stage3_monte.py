"""Monte Carlo future-state projection with coupled belief-strain dynamics."""

from __future__ import annotations

import time as time_mod
from typing import Any, Callable

import numpy as np

from app.models.stage3 import (
    FanChartPoint,
    FutureStateDistribution,
    HorizonDistribution,
    MonteCarloAudit,
    OuParameters,
    PersonalR0Estimate,
    ProjectionQuality,
)
from app.pipeline.stage3_ou import ou_exact_step

STATE_DIM = 6
FAN_INTERVAL = 30

# Per-path entropy: lognormal scales for OU params, Gaussian anchor noise, strain shocks
ALPHA_PERTURB_LOGSIG = 0.22
SIGMA_PERTURB_LOGSIG = 0.18
INPUT_PERTURB_LOGSIG = 0.15
X0_NOISE = np.array([0.10, 0.06, 0.06, 0.06, 0.08, 0.06])
XSTAR_NOISE = np.array([0.05, 0.04, 0.04, 0.04, 0.05, 0.04])
STRAIN_PARAM_LOGSIG = 0.16
ENGAGEMENT_SHOCK_PROB = 0.025
ENGAGEMENT_SHOCK_STD = 0.10
SAMPLE_PATH_COUNT = 6


def _ou_noise_std(alpha_diag: np.ndarray, sigma: np.ndarray, dt: float) -> np.ndarray:
    var = np.where(
        alpha_diag > 1e-6,
        (sigma ** 2 / (2 * alpha_diag)) * (1 - np.exp(-2 * alpha_diag * dt)),
        (sigma ** 2) * dt,
    )
    return np.sqrt(np.maximum(var, 1e-10))


def _strain_params(strains: list[PersonalR0Estimate]) -> tuple[np.ndarray, np.ndarray, np.ndarray]:
    n = max(len(strains), 1)
    beta = np.array([s.beta for s in strains] or [0.1])
    gamma = np.array([s.gamma for s in strains] or [0.12])
    i0 = np.array([s.recent_activation or s.activation_history[-1] if s.activation_history else 0.05 for s in strains] or [0.05])
    return beta, gamma, i0


def _evolve_strains_step(S: np.ndarray, I: np.ndarray, R: np.ndarray, beta: np.ndarray, gamma: np.ndarray, dt: float) -> tuple[np.ndarray, np.ndarray, np.ndarray]:
    n = len(I)
    dI = (beta * S * I - gamma * I) * dt
    dS = (-beta * S * I) * dt
    dR = gamma * I * dt
    S = np.clip(S + dS, 0, 1)
    I = np.clip(I + dI, 0, 1)
    R = np.clip(R + dR, 0, 1)
    total = S + I + R + 1e-8
    S, I, R = S / total, I / total, R / total
    return S, I, R


def _regime_quadrant(valence: float, arousal: float) -> int:
    if valence >= 0 and arousal >= 0.5:
        return 0
    if valence >= 0:
        return 1
    if arousal >= 0.5:
        return 2
    return 3


def compute_projection_quality(
    ou: OuParameters,
    n_posts: int,
    horizons: list[int],
    strains: list[PersonalR0Estimate],
    state_agreement: float,
    tau: float,
) -> ProjectionQuality:
    data_coverage = min(1.0, n_posts / 40)
    ou_fit = min(1.0, max(0.0, ou.r_squared))
    strain_stability = float(np.mean([s.relevance_score for s in strains])) if strains else 0.3
    base = 0.2 + 0.35 * data_coverage + 0.3 * ou_fit + 0.15 * strain_stability
    overall = min(0.9, max(0.12, base * (0.7 + 0.3 * state_agreement)))

    horizon_conf: dict[str, float] = {}
    for h in horizons:
        horizon_conf[str(h)] = round(min(0.95, overall * np.exp(-h / max(tau, 1.0))), 3)

    notes: list[str] = []
    if n_posts < 20:
        notes.append("Fewer than 20 posts — projections are exploratory.")
    if ou.fit_method == "insufficient_data":
        notes.append("OU fit used fallback parameters.")
    if state_agreement < 0.5:
        notes.append("Measured post states and LLM persona state diverge — fused anchor used.")

    return ProjectionQuality(
        overall=round(overall, 3),
        data_coverage=round(data_coverage, 3),
        ou_fit=round(ou_fit, 3),
        strain_stability=round(strain_stability, 3),
        state_agreement=round(state_agreement, 3),
        horizon_confidence=horizon_conf,
        horizon_decay_tau=tau,
        notes=notes,
    )


def _derive_scenarios_clustered(
    terminal_states: np.ndarray,
    strain_terminal: np.ndarray,
    strains: list[PersonalR0Estimate],
    x_star: np.ndarray,
    username: str,
) -> list[dict[str, Any]]:
    if len(terminal_states) == 0:
        return []

    v_end = terminal_states[:, 0]
    features = np.column_stack([v_end, terminal_states[:, 1], terminal_states[:, 2]])
    if strain_terminal.size:
        features = np.column_stack([features, strain_terminal.max(axis=1)])

    q33, q66 = np.percentile(features[:, 0], [33, 66])
    labels = np.zeros(len(features), dtype=int)
    labels[features[:, 0] <= q33] = 2
    labels[features[:, 0] >= q66] = 1

    top_strain = strains[0].label if strains else "primary theme"
    expand = next((s for s in strains if s.trajectory == "expanding"), strains[0] if strains else None)
    contract = next((s for s in strains if s.trajectory == "contracting"), None)

    names = [
        (f"Amplification: {expand.label if expand else top_strain}", 1),
        ("Baseline continuity", 0),
        ("Pivot / regime shift", 2),
    ]
    raw = []
    for name, lid in names:
        if lid == 0:
            mask = np.abs(v_end - x_star[0]) < 0.25
        elif lid == 1:
            mask = labels == 1
        else:
            mask = labels == 2
        prob = float(np.mean(mask))
        if lid == 1:
            desc = f"@{username}'s {expand.label if expand else top_strain} thread intensifies — higher arousal and on-theme engagement."
        elif lid == 2:
            desc = f"Valence shifts away from baseline ({x_star[0]:+.2f}) — possible pivot from {contract.label if contract else 'current themes'}."
        else:
            desc = f"@{username} remains near emotional baseline — {top_strain} stays background."
        raw.append({"name": name, "probability": prob, "description": desc})

    total = sum(s["probability"] for s in raw) or 1.0
    return [{**s, "probability": s["probability"] / total} for s in raw]


def run_monte_carlo(
    ou: OuParameters,
    current_state: np.ndarray,
    horizons: list[int],
    derived_inputs: np.ndarray,
    n_simulations: int = 3000,
    progress_cb: Callable[[int, int], None] | None = None,
    random_seed: int | None = None,
    strains: list[PersonalR0Estimate] | None = None,
    username: str = "",
    projection_quality: ProjectionQuality | None = None,
    dt_day: float = 1.0,
) -> FutureStateDistribution:
    rng = np.random.default_rng(random_seed)
    if random_seed is None:
        random_seed = int(time_mod.time() * 1000) % (2**31)
        rng = np.random.default_rng(random_seed)

    t0 = time_mod.perf_counter()
    strains = strains or []
    alpha_base = np.array(ou.alpha)
    x_star = np.array(ou.x_star)
    sigma_base = np.array(ou.sigma)
    B = np.array(ou.input_matrix_b) if ou.input_matrix_b else np.zeros((STATE_DIM, 4))
    u = derived_inputs if derived_inputs.ndim == 1 else np.mean(derived_inputs, axis=0)
    alpha_diag = np.clip(np.diag(alpha_base), 0.05, 10.0)

    max_horizon = max(horizons)
    results: dict[int, list] = {h: [] for h in horizons}
    fan_days = list(range(FAN_INTERVAL, max_horizon + 1, FAN_INTERVAL))
    if max_horizon not in fan_days:
        fan_days.append(max_horizon)
    fan_store: dict[int, list[float]] = {d: [] for d in fan_days}

    strain_terminal: list[list[float]] = []
    regime_start = _regime_quadrant(float(current_state[0]), float(current_state[1]))
    regime_persist: dict[int, list[bool]] = {h: [] for h in horizons}
    valence_cross: dict[int, list[bool]] = {h: [] for h in horizons}

    beta_s, gamma_s, i0 = _strain_params(strains)
    n_strains = len(strains)

    sample_indices = set(
        int(i * (n_simulations - 1) / max(SAMPLE_PATH_COUNT - 1, 1))
        for i in range(SAMPLE_PATH_COUNT)
    )
    sample_paths: list[dict[str, Any]] = []
    progress_updates = 0
    v0 = float(current_state[0])
    progress_stride = max(100, n_simulations // 40)

    entropy_sources = [
        f"lognormal α perturbation (σ={ALPHA_PERTURB_LOGSIG})",
        f"lognormal σ perturbation (σ={SIGMA_PERTURB_LOGSIG})",
        f"lognormal B·u input perturbation (σ={INPUT_PERTURB_LOGSIG})",
        "Gaussian initial-state noise around fused anchor",
        "Gaussian baseline x* jitter per path",
        "SIR strain β/γ perturbation per path",
        f"engagement shock events (p={ENGAGEMENT_SHOCK_PROB})",
        "exact OU matrix step with diagonal diffusion",
    ]

    for sim in range(n_simulations):
        alpha_sim = alpha_base * rng.lognormal(0, ALPHA_PERTURB_LOGSIG, alpha_base.shape)
        np.fill_diagonal(alpha_sim, np.clip(np.diag(alpha_sim), 0.05, 10.0))
        sigma_sim = sigma_base * rng.lognormal(0, SIGMA_PERTURB_LOGSIG, len(sigma_base))
        u_sim = u * rng.lognormal(0, INPUT_PERTURB_LOGSIG, len(u)) if u.size else u
        x_star_sim = x_star + rng.normal(0, XSTAR_NOISE)
        x = current_state + rng.normal(0, X0_NOISE)
        x[0] = float(np.clip(x[0], -1, 1))
        x[1:] = np.clip(x[1:], 0, 1)

        beta_sim = beta_s * rng.lognormal(0, STRAIN_PARAM_LOGSIG, len(beta_s)) if n_strains else beta_s
        gamma_sim = gamma_s * rng.lognormal(0, STRAIN_PARAM_LOGSIG, len(gamma_s)) if n_strains else gamma_s

        S = np.clip(1.0 - i0 - 0.05, 0.05, 0.95) * np.ones(n_strains) if n_strains else np.array([])
        I = np.clip(i0 + rng.normal(0, 0.03, n_strains), 0, 0.5) if n_strains else np.array([])
        R = np.clip(1.0 - S - I, 0, 0.5) if n_strains else np.array([])
        path_valence: list[float] = []

        for day in range(1, max_horizon + 1):
            x = ou_exact_step(x, x_star_sim, alpha_sim, sigma_sim, dt_day, B, u_sim, rng)

            if n_strains:
                S, I, R = _evolve_strains_step(S, I, R, beta_sim, gamma_sim, dt_day)
                # Couple dominant strain activation to ideological / engagement dimensions
                x[5] = float(np.clip(x[5] + 0.04 * float(np.max(I)) - 0.02, 0, 1))
                x[4] = float(np.clip(x[4] + 0.03 * float(np.mean(I)) - 0.015, 0, 1))

            if rng.random() < ENGAGEMENT_SHOCK_PROB:
                x[4] = float(np.clip(x[4] + rng.normal(0, ENGAGEMENT_SHOCK_STD), 0, 1))
                x[1] = float(np.clip(x[1] + abs(rng.normal(0, ENGAGEMENT_SHOCK_STD * 0.5)), 0, 1))

            if day in fan_days:
                fan_store[day].append(float(x[0]))
            if day in horizons:
                results[day].append(x.copy())
                if day == max_horizon and n_strains:
                    strain_terminal.append(I.tolist())
                regime_persist[day].append(_regime_quadrant(float(x[0]), float(x[1])) == regime_start)
                if abs(v0) > 0.05:
                    valence_cross[day].append(np.sign(x[0]) != np.sign(v0))
                else:
                    valence_cross[day].append(float(x[0]) < -0.1)

            if sim in sample_indices and day % FAN_INTERVAL == 0:
                path_valence.append(float(x[0]))

        if sim in sample_indices:
            sample_paths.append({"sim_index": sim, "valence_every_30d": path_valence})

        if progress_cb and ((sim + 1) % progress_stride == 0 or sim + 1 == n_simulations):
            progress_cb(sim + 1, n_simulations)
            progress_updates += 1

    elapsed_ms = (time_mod.perf_counter() - t0) * 1000
    pq = projection_quality
    terminal_arr = np.array(strain_terminal) if strain_terminal else np.zeros((0, n_strains))

    distributions: dict[str, HorizonDistribution] = {}
    valence_std_by_horizon: dict[str, float] = {}
    for horizon in horizons:
        sims = np.array(results[horizon])
        if len(sims) == 0:
            continue
        valence_std_by_horizon[str(horizon)] = float(np.std(sims[:, 0]))
        h_conf = pq.horizon_confidence.get(str(horizon), pq.overall if pq else 0.5) if pq else 0.5
        distributions[str(horizon)] = HorizonDistribution(
            horizon_days=horizon,
            median=np.median(sims, axis=0).tolist(),
            mean=np.mean(sims, axis=0).tolist(),
            p10=np.percentile(sims, 10, axis=0).tolist(),
            p90=np.percentile(sims, 90, axis=0).tolist(),
            p_positive_valence=float(np.mean(sims[:, 0] > 0)),
            p_high_arousal=float(np.mean(sims[:, 1] > 0.6)),
            p_low_stability=float(np.mean(sims[:, 2] < 0.3)),
            p_high_ideological=float(np.mean(sims[:, 5] > 0.7)),
            p_valence_cross_zero=float(np.mean(valence_cross.get(horizon, [False]))),
            p_regime_persistence=float(np.mean(regime_persist.get(horizon, [False]))),
            confidence=h_conf,
        )

    terminal = np.array(results[max_horizon]) if results[max_horizon] else np.zeros((0, STATE_DIM))
    scenario_paths = _derive_scenarios_clustered(
        terminal, terminal_arr, strains, x_star, username,
    )

    convergence_ok = True
    if len(terminal) >= 200:
        mid = len(terminal) // 2
        drift = abs(float(np.mean(terminal[:mid, 0])) - float(np.mean(terminal[mid:, 0])))
        convergence_ok = drift < 0.05

    fan_chart = [
        FanChartPoint(
            day=d,
            p10=float(np.percentile(fan_store[d], 10)),
            p50=float(np.percentile(fan_store[d], 50)),
            p90=float(np.percentile(fan_store[d], 90)),
        )
        for d in sorted(fan_store.keys())
        if fan_store[d]
    ]

    proj_conf = pq.overall if pq else min(0.85, max(0.15, ou.r_squared * 0.6 + min(1.0, ou.n_observations / 30) * 0.25))

    for _s in strains:
        pass

    audit = MonteCarloAudit(
        n_simulations=n_simulations,
        horizons_days=horizons,
        state_dimensions=STATE_DIM,
        elapsed_ms=round(elapsed_ms, 1),
        random_seed=random_seed,
        total_timestep_updates=n_simulations * max_horizon,
        paths_integrated=n_simulations,
        ou_r_squared=ou.r_squared,
        ou_fit_method=ou.fit_method,
        ou_n_observations=ou.n_observations,
        model=(
            f"{n_simulations:,} independent paths × {max_horizon}d calendar integration: "
            "matrix OU (expm step) + B·u drift + lognormal parameter entropy + "
            "coupled SIR strain dynamics + engagement shocks"
        ),
        progress_updates=progress_updates,
        valence_std_by_horizon=valence_std_by_horizon,
        mean_valence_spread=float(np.mean(list(valence_std_by_horizon.values()))) if valence_std_by_horizon else 0.0,
        convergence_ok=convergence_ok,
        sample_valence_paths=sample_paths,
        calendar_integrated_days=max_horizon,
        mean_post_interval_days=ou.mean_dt_days,
        per_dimension_r2=ou.per_dimension_r2,
        half_lives_days=ou.half_lives_days,
        entropy_sources=entropy_sources,
    )

    return FutureStateDistribution(
        horizons=distributions,
        projection_confidence=proj_conf,
        projection_quality=pq,
        scenario_paths=scenario_paths,
        simulation_audit=audit,
        fan_chart=fan_chart,
        dominant_future_strains=strains,
    )
