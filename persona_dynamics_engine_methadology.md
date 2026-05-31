# Persona Dynamics Engine
## Multi-Agent Debate Architecture for Deep Persona Construction and Future State Projection from a Public Instagram Profile

---

## The Intellectual Ambition

A public Instagram profile is not a collection of posts.

It is a **longitudinal psychological record** — a time-ordered sequence of decisions about
what to say, how to frame it, what emotion to perform, what tribe to signal membership in,
and what the world owes the speaker. Every caption is a micro-confession. Every hashtag is a
tribal allegiance declaration. Every engagement pattern is a behavioural vote on what the
person actually values versus what they perform valuing.

The ambition of this system is to read that record the way a skilled analyst reads a case
file: not accepting any single data point at face value, but looking at the *pattern of
patterns* — the second-order structure that reveals what a person is actually like, not
what they present themselves as being.

The mathematical framework asks a question that standard profiling systems never ask:

**What is the dynamical system that generated this observable trajectory?**

Not "what did they post?" but "what underlying psychological process, operating under
what constraints, with what attractors and what perturbations, would produce exactly
this sequence of outputs?"

That is the question the Persona Dynamics Engine is designed to answer.

---

## The Core Architecture: Three Stages

```
STAGE 1: PROFILE SIGNAL EXTRACTION
  Input: Public Instagram profile URL
  Output: Temporal signal matrix — a structured record of all observable signals
          from all posts, ordered chronologically

STAGE 2: MULTI-AGENT DEBATE COUNCIL
  Input: Temporal signal matrix
  Process: Six specialised agents each build an independent hypothesis about the person.
           Agents then engage in structured debate — challenging each other's hypotheses,
           demanding evidence, and forcing revision.
           A synthesis agent resolves the debate into a unified persona model.
  Output: PersonaModel — a structured psychological profile with confidence intervals

STAGE 3: FUTURE STATE PROJECTION
  Input: PersonaModel + temporal signal matrix
  Mathematics: First-order ODE system modelling psychological state as a dynamical system
               SIR-derived belief contagion model for ideological trajectory
               Phase portrait analysis for attractor identification
               Monte Carlo ensemble for uncertainty quantification
  Output: FutureStateDistribution — probability distributions over the person's
          psychological, behavioural, and ideological state at T+30, T+90, T+180 days
```

---

## Stage 1: Profile Signal Extraction

### What to Extract From a Public Profile

```python
class ProfileSignalMatrix(BaseModel):
    """
    The full temporal record of observable signals from a public Instagram profile.
    Each field is a time-ordered list — index 0 is the oldest post.
    """
    # Identity signals
    username: str
    bio: Optional[str]              # The bio text (often the most curated self-description)
    bio_link: Optional[str]         # What they link to reveals priorities
    profile_category: Optional[str] # Creator/Business/Personal (Instagram category)
    account_age_days: int           # How long they have been active
    
    # Volume signals (per-post time series)
    post_timestamps: list[datetime]
    
    # Content signals (per-post)
    captions: list[str]
    hashtag_sets: list[list[str]]
    image_urls: list[str]
    video_urls: list[Optional[str]]
    audio_tracks: list[Optional[str]]   # Reel music choices
    post_types: list[str]               # image / video / carousel / reel / story
    
    # Engagement signals (per-post)
    likes: list[int]
    comments_counts: list[int]
    saves: list[Optional[int]]
    views: list[Optional[int]]
    
    # Comment content (top comments per post)
    comment_streams: list[list[CommentData]]
    
    # Network signals
    follower_count: int
    following_count: int
    follower_following_ratio: float
    
    # Derived temporal signals (computed from raw)
    posting_intervals_hours: list[float]     # Gap between consecutive posts
    engagement_rates: list[float]            # engagement / followers per post
    engagement_velocities: list[float]       # rate of early engagement
    caption_lengths: list[int]               # Words per caption
    hashtag_counts: list[int]                # Hashtags per post
```

### Extraction Pipeline

```python
import instaloader
from datetime import datetime, timedelta

def extract_profile(url: str, lookback_days: int = 365) -> ProfileSignalMatrix:
    """
    Extract all observable signals from a public Instagram profile.
    
    lookback_days: How far back to analyse. Recommended:
      90 days:  Recent state, high signal freshness, lower context
      365 days: Full annual cycle, captures seasonal patterns, life events
      730 days: Two-year arc, reveals long-term trajectory
    
    Note on rate limiting:
      Instaloader has built-in respectful rate limiting.
      For 365 days of posts from an active creator: ~3-8 minutes.
    """
    L = instaloader.Instaloader(
        download_pictures=False,   # Don't download, just get URLs
        download_videos=False,
        download_comments=True,
        save_metadata=True,
    )
    
    username = url.rstrip("/").split("/")[-1].lstrip("@")
    profile = instaloader.Profile.from_username(L.context, username)
    
    cutoff = datetime.utcnow() - timedelta(days=lookback_days)
    
    posts_data = []
    for post in profile.get_posts():
        if post.date_utc < cutoff:
            break
        posts_data.append(extract_post_signals(post))
    
    # Sort chronologically (oldest first for time-series analysis)
    posts_data.sort(key=lambda p: p["timestamp"])
    
    return build_signal_matrix(profile, posts_data)
```

### Derived Signal Computation

Before any analysis, compute derived temporal signals that reveal patterns invisible
in raw data:

```python
def compute_derived_signals(matrix: ProfileSignalMatrix) -> DerivedSignals:
    """
    Compute second-order signals from the raw time series.
    These are often more revealing than the raw signals themselves.
    """
    
    # 1. POSTING RHYTHM ANALYSIS
    # Regular posting = professional/disciplined/strategic
    # Irregular posting = reactive/emotional/life-event-driven
    intervals = matrix.posting_intervals_hours
    posting_regularity = 1.0 - (np.std(intervals) / (np.mean(intervals) + 1e-6))
    # regularity close to 1.0 = very consistent posting schedule (strategic creator)
    # regularity close to 0.0 = highly irregular (emotional/reactive poster)
    
    # 2. ENGAGEMENT TREND (linear regression over time)
    # Is their audience growing with them, or are they losing resonance?
    t = np.arange(len(matrix.engagement_rates))
    engagement_slope, engagement_intercept = np.polyfit(t, matrix.engagement_rates, 1)
    # positive slope = growing engagement (audience increasingly aligned)
    # negative slope = declining engagement (drift from audience expectations)
    
    # 3. CAPTION LENGTH EVOLUTION
    # Increasing length over time = person becoming more explanatory/defensive/complex
    # Decreasing length = becoming more confident/cryptic/performative
    caption_slope, _ = np.polyfit(t, matrix.caption_lengths, 1)
    
    # 4. HASHTAG STRATEGY EVOLUTION
    # Decreasing hashtag count over time = growing organic reach (less SEO needed)
    # Increasing hashtag count = reach anxiety, trying to grow
    hashtag_slope, _ = np.polyfit(t, matrix.hashtag_counts, 1)
    
    # 5. EMOTIONAL VOLATILITY INDEX
    # Compute emotion per post, then measure variance over time
    # High volatility = emotionally reactive person or highly event-driven content
    # Low volatility = stable emotional baseline, consistent persona projection
    emotion_scores = [extract_quick_emotion(caption) for caption in matrix.captions]
    emotional_volatility = np.std([e["arousal"] for e in emotion_scores])
    
    # 6. BURST DETECTION
    # Moments when posting frequency suddenly increased
    # Bursts often correspond to life events, emotional crises, or external triggers
    bursts = detect_posting_bursts(matrix.posting_intervals_hours)
    
    # 7. TOPIC DRIFT DETECTION
    # Did the person's core topics change significantly over the analysis period?
    early_topics = extract_topics(matrix.captions[:len(matrix.captions)//3])
    recent_topics = extract_topics(matrix.captions[-len(matrix.captions)//3:])
    topic_drift_score = 1.0 - topic_overlap(early_topics, recent_topics)
    # 0.0 = stable topics, 1.0 = complete topic shift
    
    # 8. PERSONA CONSISTENCY SCORE
    # Do the visual signals, text signals, and engagement signals all point
    # in the same direction? Or is there systematic dissonance?
    persona_consistency = compute_cross_modal_consistency(matrix)
    
    return DerivedSignals(
        posting_regularity=posting_regularity,
        engagement_slope=engagement_slope,
        caption_length_slope=caption_slope,
        hashtag_slope=hashtag_slope,
        emotional_volatility=emotional_volatility,
        burst_events=bursts,
        topic_drift_score=topic_drift_score,
        persona_consistency_score=persona_consistency,
    )
```

---

## Stage 2: The Multi-Agent Debate Council

### Why Debate Rather Than Single Analysis?

A single LLM asked "what is this person like?" will produce a plausible, coherent, 
and almost certainly overconfident answer. It will pick a narrative that fits the 
available data and stop looking for contradictions.

A council of agents, each with a different analytical lens, each required to 
defend a hypothesis against adversarial challenge from other agents, produces 
something fundamentally different: a **stress-tested persona model** where every 
claim has survived challenge from a different theoretical framework.

This is the methodology of intelligence analysis (the "red team" principle), 
of clinical diagnosis (the multi-disciplinary team), and of peer review (the 
systematic adversarial scrutiny of claims). The output is more reliable not 
because each agent is smarter, but because the *process* is designed to surface 
contradictions rather than suppress them.

### The Six Analytical Agents

Each agent receives the full ProfileSignalMatrix and DerivedSignals, but is 
instructed to analyse it exclusively through their own theoretical lens.

---

#### Agent 1: The Psychographer
**Lens:** Personality psychology — Big Five traits, attachment style, identity theory

```python
PSYCHOGRAPHER_SYSTEM = """
You are a computational personality psychologist.
Your job is to infer personality traits from observable digital behaviour.

Theoretical frameworks you use:
- Big Five (OCEAN): Openness, Conscientiousness, Extraversion, Agreeableness, Neuroticism
- Attachment theory: secure, anxious, avoidant, disorganised patterns in how the 
  person relates to their audience (do they seek validation? maintain distance? oscillate?)
- Identity status theory (Marcia): is this person's identity foreclosed (rigid), 
  moratorium (searching), achieved (stable), or diffused (unclear)?
- Self-monitoring theory: is this person a high self-monitor 
  (performs carefully for audience) or low (authentic but less strategic)?

You look for:
- Consistency of persona across post types (high = stable identity)
- Language patterns: tentative vs assertive, inclusive ("we") vs exclusive ("I vs they")
- Response to negative engagement (delete, defend, ignore, double-down?)
- Posting rhythm irregularities (emotional regulation signals)

You NEVER diagnose clinical conditions. You describe personality tendencies.
You must provide EVIDENCE for every claim: cite specific posts, patterns, or metrics.
"""

async def psychographer_analysis(matrix: ProfileSignalMatrix, derived: DerivedSignals) -> AgentHypothesis:
    prompt = f"""
Analyse this Instagram profile through a personality psychology lens.

Profile overview:
  Posts analysed: {len(matrix.captions)}
  Account age: {matrix.account_age_days} days
  Follower/following ratio: {matrix.follower_following_ratio:.2f}
  Posting regularity: {derived.posting_regularity:.2f} (0=chaotic, 1=perfectly regular)
  Emotional volatility: {derived.emotional_volatility:.2f}
  Engagement trend slope: {derived.engagement_slope:+.4f}

Recent captions (last 10, oldest first):
{format_captions(matrix.captions[-10:])}

Hashtag evolution (first period vs last period):
  Early: {matrix.hashtag_sets[:5]}
  Recent: {matrix.hashtag_sets[-5:]}

Caption length trend: {derived.caption_length_slope:+.2f} words/post over time

Produce:
1. Big Five profile (score 1-10 for each dimension with evidence)
2. Attachment pattern to audience (with evidence)
3. Identity status assessment (with evidence)
4. Self-monitoring level (high/medium/low with evidence)
5. Your SINGLE most confident personality hypothesis about this person
6. The evidence that would REFUTE your hypothesis (what you'd need to see to be wrong)

Return as structured JSON.
"""
    return AgentHypothesis(
        agent="psychographer",
        analysis=await call_llm_async(PSYCHOGRAPHER_SYSTEM, prompt),
    )
```

---

#### Agent 2: The Sociologist
**Lens:** Social capital theory, field theory (Bourdieu), identity performance (Goffman)

```python
SOCIOLOGIST_SYSTEM = """
You are a computational sociologist.
Your job is to understand the social position and social strategy of a person
from their digital behaviour.

Theoretical frameworks:
- Bourdieu's field theory: what forms of capital is this person accumulating?
  (economic, cultural, social, symbolic) — which do they display, which do they pursue?
- Goffman's dramaturgical theory: the Instagram profile is a "front stage" performance.
  What is the performed identity? What clues exist about the "backstage" real self?
- Social capital theory (Putnam/Coleman): bonding capital (tight in-group) vs 
  bridging capital (loose connections across groups). Which dominates?
- Tribal signalling theory: which communities is this person signalling membership in?
  Which are they signalling distance from?

You look for:
- Which social groups does the content reference positively vs negatively?
- What status markers are displayed (education, travel, goods, relationships)?
- Is the audience being constructed as a community (we) or a market (followers)?
- What social anxieties does the content reveal (fear of downward mobility? 
  fear of cultural irrelevance? fear of social exclusion?)?
"""
```

---

#### Agent 3: The Narrative Analyst
**Lens:** Narratology, frame analysis, rhetorical structure

```python
NARRATIVE_ANALYST_SYSTEM = """
You are an expert in computational narrative analysis.
Your job is to identify the META-NARRATIVE this person tells about themselves and their world.

Theoretical frameworks:
- Narrative identity theory (McAdams): people construct identity through the stories 
  they tell. What is this person's "personal myth"?
- Frame analysis (Goffman/Entman): how does this person consistently frame situations?
  What is always the protagonist role? Who are the recurring antagonists?
- Rhetorical situation analysis: what problem is this person always responding to?
  What do they position themselves as the solution to?
- Narrative arc analysis: is this person telling a story of ascent (getting better),
  contamination (things were good, now bad), redemption (bad then good), 
  or stability (things are consistent)?

Key questions:
- What is the recurring protagonist-antagonist structure in their content?
- What is the implicit "moral" of their content: what should the audience conclude?
- Is their narrative arc consistent over time, or has it shifted?
- What do they never talk about? (Absence is also data.)
"""
```

---

#### Agent 4: The Behavioural Economist
**Lens:** Revealed preferences, loss aversion, temporal discounting, social proof

```python
BEHAVIOURAL_ECONOMIST_SYSTEM = """
You are a behavioural economist analysing revealed preferences from digital behaviour.

Core principle: what people DO reveals preferences more reliably than what they SAY.
Instagram behaviour — what they post, when, how much effort they invest — reveals 
true preferences, not stated ones.

Frameworks:
- Revealed preference theory: the pattern of posting choices reveals what this person
  actually values, independent of what they claim to value
- Loss aversion: are their posts more often about protecting something they have
  or gaining something they lack? Loss-framed content reveals loss-averse psychology.
- Temporal discounting: do they post about long-term goals or immediate experiences?
  High temporal discounting = present-oriented, reward-sensitive, impulsive.
- Social proof seeking: do they post content designed to validate their choices
  (seeking social proof that they are right), or content designed to inform others?

You specifically look at:
- EFFORT SIGNALS: long captions with elaboration = high investment. 
  Short captions with emojis = low investment. What topics get most effort?
- TIMING PATTERNS: posting at peak engagement hours = strategic audience-seeking.
  Posting at odd hours = emotional/reactive posting. What topics get posted when?
- DELETION BEHAVIOUR (inferred from gaps): sudden drops in post count during a period
  suggest deletions = what the person regretted saying
- ENGAGEMENT ASYMMETRY: if they get more engagement on topic A than topic B,
  but keep posting more of topic B, they are prioritising identity expression
  over audience maximisation. Reveals values.
"""
```

---

#### Agent 5: The Temporal Pattern Analyst
**Lens:** Time-series analysis, change point detection, trajectory modelling

```python
TEMPORAL_ANALYST_SYSTEM = """
You are a time-series analyst specialising in longitudinal behavioural data.
Your job is NOT to interpret what the content means — that is for other agents.
Your job is to identify WHEN things changed and WHAT THE CHANGE PATTERN looks like.

You work with:
- Posting frequency changes over time (acceleration, deceleration, bursts, gaps)
- Engagement rate trend (rising, falling, stable, volatile)
- Caption length evolution (shortening, lengthening, consistent)
- Emotional tone evolution (becoming more or less emotionally charged)
- Topic stability or drift
- Response to external events (do posts spike or drop after major world events?)

Mathematical tools:
- Change point detection: find moments when the time series behaviour 
  shifted significantly (different mean, variance, or trend)
- Exponential smoothing: separate short-term noise from long-term trend
- Autocorrelation: does this person's posting behaviour today predict 
  their posting behaviour next week? (high autocorrelation = strong routine)
- Cross-correlation: do posting bursts correlate with world events? 
  (high correlation = externally reactive person)

You output:
- A timeline of change points with best-guess explanation of what caused them
- Whether the overall trajectory is stable, improving, deteriorating, or volatile
- The person's response pattern to perturbations (how quickly do they return to baseline?)
"""
```

---

#### Agent 6: The Cultural Context Analyst
**Lens:** Cultural semiotics, subcultural theory, local context interpretation

```python
CULTURAL_ANALYST_SYSTEM = """
You are an expert in South Asian digital cultural context, specifically 
Indian social media semiotics.

Your job is to interpret signals that only make sense in their cultural context:
- Which audio tracks they use (what cultural affiliations they signal)
- Regional language patterns in otherwise English/Hindi content (Tamil words,
  Bengali expressions, etc. = who they are really speaking to)
- Religious and festival references (what calendar they live in)
- Food references (regional identity markers)
- Bollywood/regional film references (cultural generation and taste markers)
- Cricket references (tribal affiliations, generational identity)
- Political reference density and direction
- Caste and community signals (often indirect but present)
- Urban/rural aspiration signals
- Education and class markers in language choices

You are specifically alert to:
- Code-switching patterns: when do they shift from one language register to another?
  (signals who they are "really" talking to in that moment)
- What they celebrate vs what they mourn (festival coverage reveals ritual community)
- How they engage with national/political events (silence is data too)
"""
```

---

### The Debate Protocol

After all six agents produce their independent hypotheses, the system runs a 
structured **three-round debate** designed to surface contradictions and force synthesis.

```python
class DebateRound(Enum):
    CHALLENGE    = 1   # Each agent challenges every other agent's hypothesis
    DEFENSE      = 2   # Each agent defends or revises under challenge
    SYNTHESIS    = 3   # Synthesis agent produces unified model

async def run_debate_council(
    hypotheses: list[AgentHypothesis],
    matrix: ProfileSignalMatrix,
    derived: DerivedSignals,
) -> DebateRecord:
    """
    Run the three-round debate among the six analytical agents.
    """
    
    # ── Round 1: Challenge ────────────────────────────────────────────────────
    # Each agent reads all other hypotheses and identifies contradictions
    
    challenges: list[Challenge] = []
    
    for challenger in hypotheses:
        for target in hypotheses:
            if challenger.agent == target.agent:
                continue
            
            challenge_prompt = f"""
You are the {challenger.agent}.

Another analyst (the {target.agent}) has made the following hypothesis about this person:

{target.analysis["key_hypothesis"]}

Their supporting evidence:
{target.analysis["evidence"]}

Your job: CHALLENGE this hypothesis.

Specifically:
1. Does this hypothesis contradict any evidence you found?
2. Is there an alternative explanation for their evidence that fits your framework better?
3. What specific data point from the profile would REFUTE their hypothesis?
4. What is the weakest link in their reasoning chain?

Be specific. Cite the profile data. Do not be diplomatic.
"""
            challenge = await call_llm_async(
                f"You are the {challenger.agent} in a debate council.",
                challenge_prompt
            )
            challenges.append(Challenge(
                challenger=challenger.agent,
                target=target.agent,
                challenge_text=challenge,
            ))
    
    # ── Round 2: Defense and Revision ────────────────────────────────────────
    # Each agent reads the challenges to their hypothesis and responds
    
    revised_hypotheses: list[RevisedHypothesis] = []
    
    for agent_hyp in hypotheses:
        agent_challenges = [c for c in challenges if c.target == agent_hyp.agent]
        
        defense_prompt = f"""
You are the {agent_hyp.agent}.

Your original hypothesis was:
{agent_hyp.analysis["key_hypothesis"]}

You have received the following challenges from other analysts:

{format_challenges(agent_challenges)}

Now:
1. Which challenges are VALID — do they point to evidence you missed or 
   misinterpreted? REVISE your hypothesis accordingly.
2. Which challenges are INVALID — and why? Defend with evidence.
3. State your REVISED hypothesis (it can be identical to the original if 
   no challenges were valid, or significantly different if they were)
4. State your confidence in your revised hypothesis: 0.0-1.0
5. What single piece of additional evidence would most increase your confidence?
"""
        revised = await call_llm_async(
            f"You are the {agent_hyp.agent}.",
            defense_prompt
        )
        revised_hypotheses.append(RevisedHypothesis(
            agent=agent_hyp.agent,
            original=agent_hyp,
            challenges_received=agent_challenges,
            revised_analysis=revised,
        ))
    
    # ── Round 3: Synthesis ────────────────────────────────────────────────────
    # A separate synthesis agent (not one of the six) produces the unified model
    
    synthesis = await run_synthesis(revised_hypotheses, matrix, derived)
    
    return DebateRecord(
        original_hypotheses=hypotheses,
        challenges=challenges,
        revised_hypotheses=revised_hypotheses,
        synthesis=synthesis,
    )
```

---

### The Synthesis Agent

The synthesis agent does not simply average the six hypotheses. It applies a specific
**contradiction-resolution protocol** that forces explicit statements about where
analysts agree, where they disagree productively, and where disagreement reveals
genuine uncertainty about the person.

```python
SYNTHESIS_SYSTEM = """
You are the synthesis analyst in a multi-agent persona council.

You have received six independent analyses and three rounds of debate.
Your job is to produce a UNIFIED PERSONA MODEL that:

1. States clearly what all six analysts agree on (high confidence claims)
2. States clearly what analysts disagree about and WHY (the disagreement itself 
   is informative: it reveals where the data is genuinely ambiguous)
3. Resolves disagreements where possible by identifying which analyst's 
   framework better fits the specific evidence
4. Explicitly acknowledges what cannot be determined from the available data

Rules:
- NEVER smooth over genuine disagreements with diplomatic language
- ALWAYS provide a confidence score (0.0-1.0) for each claim
- ALWAYS cite the specific evidence supporting each claim
- Claims with confidence < 0.5 must be flagged as speculative
- You are building a model of a REAL person. Epistemic humility is mandatory.
"""

async def run_synthesis(
    revised: list[RevisedHypothesis],
    matrix: ProfileSignalMatrix,
    derived: DerivedSignals,
) -> PersonaModel:
    
    synthesis_prompt = f"""
You have six revised agent analyses after three rounds of debate.

Here are the key claims from each agent (after revision):

PSYCHOGRAPHER: {revised[0].revised_analysis["key_claim"]}
  Confidence: {revised[0].revised_analysis["confidence"]}
  
SOCIOLOGIST: {revised[1].revised_analysis["key_claim"]}
  Confidence: {revised[1].revised_analysis["confidence"]}

NARRATIVE ANALYST: {revised[2].revised_analysis["key_claim"]}
  Confidence: {revised[2].revised_analysis["confidence"]}

BEHAVIOURAL ECONOMIST: {revised[3].revised_analysis["key_claim"]}
  Confidence: {revised[3].revised_analysis["confidence"]}

TEMPORAL ANALYST: {revised[4].revised_analysis["key_claim"]}
  Confidence: {revised[4].revised_analysis["confidence"]}

CULTURAL ANALYST: {revised[5].revised_analysis["key_claim"]}
  Confidence: {revised[5].revised_analysis["confidence"]}

Key unresolved contradictions from the debate:
{format_unresolved_contradictions(revised)}

Profile summary statistics:
  Posts: {len(matrix.captions)} | Account age: {matrix.account_age_days} days
  Posting regularity: {derived.posting_regularity:.2f}
  Emotional volatility: {derived.emotional_volatility:.2f}
  Topic drift score: {derived.topic_drift_score:.2f}

Produce the UNIFIED PERSONA MODEL with these sections:
1. Core Identity (high-confidence claims, confidence > 0.7)
2. Psychological Profile (Big Five, attachment, identity status)
3. Social Strategy and Capital
4. Narrative Self-Model (the story they tell about themselves)
5. Revealed Preferences (what behaviour shows they actually value)
6. Cultural Identity and Tribal Affiliations
7. Temporal State (where are they in their psychological journey RIGHT NOW)
8. Genuine Uncertainties (what cannot be determined from this data)
9. The Single Most Insightful Observation from the entire debate

Return as structured JSON with confidence scores for every claim.
"""
    result = await call_llm_async(SYNTHESIS_SYSTEM, synthesis_prompt)
    return PersonaModel(**result)
```

---

## Stage 3: Future State Projection — The Mathematics

> **Implementation alignment:** The running pipeline is in `backend/app/pipeline/stage3_state.py`, `stage3_ou.py`, `stage3_monte.py`, `belief_strain_engine.py`, and `stage3_project.py`. Subsections marked **(as implemented)** describe what the North Star codebase actually computes. For event flow and module wiring, see `ARCHITECTURE_FLOW.md` §6.

This is the most ambitious section. It applies dynamical systems mathematics to project
where this person's psychological and behavioural state is heading.

### The Conceptual Framework

A person's psychological state at any given time can be represented as a point in a
multi-dimensional **state space**. Each dimension represents a measurable psychological
variable — emotional valence, identity stability, social engagement level, ideological
intensity, etc.

Over time, this point moves through state space. The history of its movement is encoded
in the ProfileSignalMatrix. The question "what is their future state?" becomes the 
question: "given the trajectory this point has followed, and the forces governing its 
motion, where will it be at T+30, T+90, T+180 days?"

This is a dynamical systems problem. And dynamical systems have mathematical structure
that we can exploit.

---

### The State Vector

We define the person's psychological state at time t as a vector:

```
x(t) = [v(t), a(t), s(t), c(t), e(t), i(t)]

Where:
  v(t) = valence      — emotional positivity/negativity (-1 to +1)
  a(t) = arousal      — emotional activation level (0 to 1)
  s(t) = stability    — identity/narrative consistency (0 to 1)
  c(t) = connectivity — social engagement intensity (0 to 1)
  e(t) = engagement   — audience resonance quality (0 to 1)
  i(t) = ideological  — ideological intensity/conviction (0 to 1)
                        (not direction — intensity regardless of direction)
```

Each component is estimated from the observable signals at each time point:
- v(t) and a(t) from caption emotion extraction (`extract_quick_emotion`)
- s(t) from rolling caption-length and engagement-rate coefficient of variation
- c(t) from hashtag density and posting-interval regularity
- e(t) from engagement rate relative to personal median baseline
- i(t) from moral/frame keyword intensity plus |v| and arousal

This gives us a **time series of state vectors** estimated from the historical data.

#### (as implemented) Calendar time between posts

Posts are **not** assumed to be evenly spaced. Transition intervals use real timestamps:

```
Δt_i = clip(t_{i+1} - t_i in days, 0.25, 90)
```

OU fitting and strain SIR fitting use these variable \(\Delta t\) values (mean interval reported as `mean_post_interval_days`). This replaces the idealized fixed `dt = 1.0` day step used in illustrative pseudocode below.

#### (as implemented) Per-dimension formulas

```python
# Valence / arousal — lexicon + exclamation density (Stage 1 shared helper)
v = clip((n_pos - n_neg) / |words| * 5, -1, 1)
a = clip(0.3 + 0.1 * n_exclaim + 0.3 * |v|, 0, 1)

# Stability — inverse CV of caption length + engagement in rolling window (default 5 posts)
s = clip(1 - min(1, (CV_cap + CV_eng) / 2), 0, 1)

# Connectivity — hashtag count + posting cadence
c = clip(0.55 * min(1, n_hashtags/8) + 0.45 * (1 - min(gap_hours/168, 1)), 0, 1)

# Engagement — post rate vs personal median
e = clip((rate_i / median(rates)) / 2, 0, 1)

# Ideological intensity — moral/frame keywords + |v| + arousal (not direction)
i = clip(0.08*moral + 0.06*frames + 0.35*|v| + 0.25*a, 0, 1)
```

#### (as implemented) Fusion with Stage 2 persona anchor

The simulation starting point \(\mathbf{x}_0\) blends the **last measured post state** with the LLM persona `current_state`:

```
x₀ = w · x_meas(last) + (1 - w) · x_LLM
```

Adaptive weight \(w\):

| Condition | w (measured) |
|-----------|----------------|
| n_posts < 5 or OU R² < 0.15 | 0.35 |
| R² > 0.45 and n_posts ≥ 25 | 0.72 |
| otherwise | 0.55 |

**State agreement** (for projection quality):

```
A = clip(1 - mean(|x_meas - x_LLM| / [2,1,1,1,1,1]), 0, 1)
```

---

### The Dynamical System

The evolution of the state vector is governed by a system of first-order ODEs.
The general form:

```
dx/dt = f(x, t, u, ε)

Where:
  x      = state vector (the six psychological dimensions)
  f      = the governing dynamics (to be estimated from data)
  t      = time
  u(t)   = external inputs (world events, life events, audience responses)
  ε      = stochastic noise (random perturbations)
```

We model f as having three components:

```
dx/dt = -α(x - x*)    ←  MEAN REVERSION to psychological equilibrium
       + B·u(t)        ←  RESPONSE to external inputs (derived signals)
       + σε(t)         ←  STOCHASTIC NOISE

Where:
  α  = mean reversion rate matrix (how quickly each dimension returns to baseline)
  x* = psychological equilibrium (attractor state — where the person "rests")
  B  = input response matrix (6×4) — how derived signals perturb each dimension
  u  = [engagement_slope×50, topic_drift, burst_intensity, emotional_volatility]
  σ  = diagonal noise amplitudes
  ε  = white noise vector
```

This is the **Ornstein-Uhlenbeck (OU) process** — a mean-reverting stochastic process
widely used in quantitative finance (for interest rates and volatility) and increasingly
in computational social science for modelling psychological dynamics.

**Why the OU process is the right model:**

1. **Mean reversion is psychologically real.** People have a baseline "set point" for
   emotional valence (well-documented in hedonic adaptation research). After positive
   or negative events, they return toward this set point. The OU process captures this.

2. **External inputs perturb the trajectory.** Life events, world events, and audience
   responses push the state away from equilibrium. The B·u(t) term models this.

3. **Stochastic noise is essential.** Human behaviour is not deterministic. The noise
   term prevents the model from being overconfident about specific future states while
   still capturing the directional tendency.

4. **The equilibrium x* is estimable from data.** The historical mean of each dimension
   is a reasonable estimate of the person's psychological attractor.

---

### Estimating the Model Parameters From Historical Data

#### (as implemented) `estimate_ou_parameters` — `stage3_ou.py`

The codebase uses a **staged fit** on calendar-spaced transitions, not a single full-matrix MLE on uniform daily data.

**Step 1 — Equilibrium:** \(\mathbf{x}^* = \text{mean}(\mathbf{x}_1, \ldots, \mathbf{x}_T)\)

**Step 2 — Centre transitions:** \(\mathbf{X} = \mathbf{x}_{1:T-1} - \mathbf{x}^*\), \(\mathbf{Y} = \mathbf{x}_{2:T} - \mathbf{x}^*\), with per-transition \(\Delta t_i\)

**Step 3 — Diagonal variable-\(\Delta t\) AR(1):** For each dimension \(d\), estimate \(\phi_d = \text{median}(Y_d / X_d)\) where \(|X_d| > \epsilon\), then

\[
\alpha_{dd} = \text{clip}\left(-\ln(\phi_d) / \overline{\Delta t},\ 0.05,\ 10\right)
\]

**Step 4 — Block coupling:** Off-diagonal terms within (valence↔arousal) and (stability↔engagement) blocks from cross-regression, clipped to \([-0.3, 0.3]\).

**Step 5 — Full matrix (optional):** If \(T \geq 40\), fit full \(\mathbf{A}\) via ridge OLS, recover \(\boldsymbol{\alpha} = -\log(\mathbf{A})/\overline{\Delta t}\) with eigenvalue stability projection. Select full matrix only if pooled R² is within 0.05 of diagonal score.

**Step 6 — External input matrix \(\mathbf{B}\):** Regress OU residuals on centred \(\mathbf{u}\) (lstsq), clip to \([-0.5, 0.5]\).

**Step 7 — Noise:** \(\sigma_d = \max(\text{std}(\text{residuals}_d), 0.01)\)

**Outputs:** `fit_method` ∈ `{insufficient_data, block_diagonal_calendar, full_matrix_calendar}`, per-dimension R², half-lives \(t_{1/2} = \ln(2)/\alpha_{dd}\), pooled R².

**Exact discrete OU step** (used in Monte Carlo — `ou_exact_step`):

\[
\mathbf{x}_{t+\Delta t} = \mathbf{x}^* + e^{-\boldsymbol{\alpha}\Delta t}(\mathbf{x}_t - \mathbf{x}^*) + \mathbf{B}\mathbf{u}\,\Delta t + \boldsymbol{\epsilon}
\]

where \(\text{Var}(\epsilon_d) = \frac{\sigma_d^2}{2\alpha_{dd}}(1 - e^{-2\alpha_{dd}\Delta t})\) for diagonal diffusion.

<details>
<summary>Idealized full-matrix MLE (reference — not the default fit path)</summary>

```python
def estimate_ou_parameters_idealized(state_history: np.ndarray, dt: float = 1.0):
    """
    Idealized maximum-likelihood sketch from the original methodology.
    The production pipeline uses calendar AR(1) + structured coupling instead.
    """
    T, D = state_history.shape
    x_star = np.mean(state_history, axis=0)
    X = state_history[:-1] - x_star
    Y = state_history[1:] - x_star
    A_T = np.linalg.lstsq(X, Y, rcond=None)[0]
    A = A_T.T
    from scipy.linalg import logm
    alpha = -logm(A) / dt
    residuals = Y - X @ A_T
    sigma = np.std(residuals, axis=0)
    return {"alpha": alpha, "x_star": x_star, "sigma": sigma, "A": A}
```

</details>

---

### The SIR-Derived Belief Contagion Model

#### (as implemented) Adaptive per-profile theme discovery

Narrative strains are **not** drawn from a fixed taxonomy (e.g. `institutional_failure`). `belief_strain_engine.py` discovers up to **4 themes per profile** from:

1. Hashtag co-occurrence clusters on the same post
2. High-frequency caption keywords (fallback if sparse hashtags)
3. Optional overlap with persona summary keywords from Stage 2

Each strain gets a human-readable `label` (e.g. `#politics · #election`) and profile-specific `strain_type` slug.

**Activation series** \(I_i \in [0,1]\) per post: keyword/hashtag hit density × engagement weighting.

**Primary trajectory label** — momentum ratio (not fragile SIR fit):

\[
r = \frac{\mean(I_{\text{recent third}})}{\mean(I_{\text{early third}}) + 0.02}
\]

| Condition | `trajectory` |
|-----------|--------------|
| \(r \geq 1.3\) | expanding / growing |
| \(r \leq 0.7\) | contracting / fading |
| else | stable |

**Secondary SIR fit** (`curve_fit` on activation history) yields \(\beta\), \(\gamma\), \(R_0 = \beta/\gamma\) for display when fit R² > 0.15. Forward projection uses Euler SIR integration from recent activation to T+30/90/180 days.

Layered on top of the OU process is a belief contagion model that tracks the 
**narrative strains** the person has been infected with, is currently spreading, 
or has recovered from.

This answers a different question: not "where is their emotional state going?" 
but "which narrative frameworks are gaining or losing influence in their worldview?"

```
For each major narrative strain in the person's content history:

  S_strain(t) = fraction of their content "susceptible" to this strain
  I_strain(t) = fraction of their content actively expressing this strain  
  R_strain(t) = fraction of their content that has "recovered" (moved on)

  dS/dt = -β_personal × S × I
  dI/dt = +β_personal × S × I - γ_personal × I
  dR/dt = +γ_personal × I

Where:
  β_personal = personal contagion rate for this narrative type
               (estimated from how fast this person adopted the strain in the past)
  γ_personal = personal forgetting rate
               (estimated from how quickly this person moved on from past strains)

R₀_personal = β_personal / γ_personal

R₀_personal > 1: this person is in an expanding engagement with this narrative
R₀_personal < 1: this person is moving away from this narrative
```

**The critical insight:** different people have different personal \(R_0\) values for 
different **profile-discovered** narrative themes. A high \(R_0\) on an expanding theme 
(e.g. a political hashtag cluster gaining momentum) means sustained engagement with that 
frame is likely. A contracting theme with low momentum means the person is moving on from 
that narrative thread — regardless of what the theme is called.

```python
def build_adaptive_strain_estimates(
    matrix: ProfileSignalMatrix,
    persona: PersonaModel | None = None,
    max_strains: int = 4,
) -> list[PersonalR0Estimate]:
    """
    (as implemented) Discover themes → measure momentum → optional SIR fit.
    
    1. discover_profile_strains() — hashtag clusters + caption keywords
    2. compute_strain_activation_series() — engagement-weighted I(t) per post
    3. _compute_momentum() — early vs recent third → trajectory label
    4. _sir_fit() — β, γ, R₀ when history length ≥ 6 and variance sufficient
    5. _project_strain_forward() — Euler SIR to horizons 30/90/180 days
    """
    ...
```

<details>
<summary>Idealized fixed-strain SIR fit (reference)</summary>

```python
def estimate_personal_r0(
    strain_history: list[float],
    dt: float = 7.0,
) -> PersonalR0Estimate:
    """Original methodology sketch — production uses adaptive discovery above."""
    from scipy.optimize import curve_fit
    from scipy.integrate import odeint
    # ... curve_fit SIR to strain_history ...
```

</details>

---

### The Phase Portrait: Visualising the Psychological Attractor

The most powerful tool from dynamical systems theory for understanding a person's 
likely future state is the **phase portrait** — a visualisation of the trajectories
in state space.

For a 2D slice of the state space (e.g., valence vs. arousal):

```python
def compute_phase_portrait(
    alpha: np.ndarray,
    x_star: np.ndarray,
    dims: tuple[int, int] = (0, 1),  # valence, arousal
) -> PhasePortrait:
    """
    Compute the vector field of the dynamical system in a 2D slice.
    
    At every point (v, a) in the valence-arousal plane, compute dx/dt.
    The arrows in the phase portrait show which direction the state will move
    from any starting point.
    
    Key features to identify:
    - Fixed points: where dx/dt = 0 (the psychological equilibrium)
    - Stable manifold: directions from which the system returns to equilibrium
    - Separatrices: boundaries between different basins of attraction
    - Limit cycles: does the person oscillate? (cyclical mood patterns)
    """
    d1, d2 = dims
    
    # Create grid
    v_range = np.linspace(-1, 1, 20)
    a_range = np.linspace(0, 1, 20)
    V, A = np.meshgrid(v_range, a_range)
    
    # Compute dx/dt at each grid point
    dV = np.zeros_like(V)
    dA = np.zeros_like(A)
    
    for i in range(V.shape[0]):
        for j in range(V.shape[1]):
            x_current = np.zeros(6)
            x_current[d1] = V[i, j]
            x_current[d2] = A[i, j]
            
            dx_dt = -alpha @ (x_current - x_star)
            dV[i, j] = dx_dt[d1]
            dA[i, j] = dx_dt[d2]
    
    return PhasePortrait(
        v_grid=V, a_grid=A,
        dv=dV, da=dA,
        equilibrium_v=x_star[d1],
        equilibrium_a=x_star[d2],
        mean_reversion_rate_v=alpha[d1, d1],
        mean_reversion_rate_a=alpha[d2, d2],
    )
```

**What the phase portrait tells us about future state:**

1. **The fixed point** (x*) is where the person "naturally rests" — their psychological
   home base. If they are currently away from it, they will tend to return.

2. **The mean reversion rate** (α) tells us how quickly. High α = rapid return 
   to baseline (resilient person). Low α = slow return (person currently in 
   extended departure from their norm — possibly a major life transition).

3. **Limit cycles / cyclicality:** `compute_phase_portrait` also computes slices on
   (stability×engagement) and (connectivity×ideological), classifies fixed-point type
   (stable_node / saddle / center), and reports `cyclicality_detected` from lagged
   valence autocorrelation when \(T \geq 8\).

---

### Monte Carlo Future State Projection

#### (as implemented) `run_monte_carlo` — `stage3_monte.py`

**Configuration** (`backend/app/config.py`):

- `MONTE_CARLO_SIMULATIONS` — default **10,000** (clamped to 10,000–25,000)
- `PROJECTION_HORIZONS_DAYS` — default `30,90,180,365`
- `PROJECTION_CONFIDENCE_TAU` — default 90 days (exponential confidence decay)

**Per simulation** (daily steps to `max(horizons)`):

1. **Entropy injection** — independent perturbations per path:
   - Lognormal scales on \(\boldsymbol{\alpha}\) (σ=0.22)
   - Lognormal scales on \(\boldsymbol{\sigma}\) (σ=0.18)
   - Lognormal scales on \(\mathbf{u}\) inputs (σ=0.15)
   - Gaussian noise on fused anchor \(\mathbf{x}_0\) and equilibrium \(\mathbf{x}^*\)
   - Lognormal perturbation of strain \(\beta, \gamma\)
   - Bernoulli engagement shocks (p=0.025)
2. **Exact OU step** via `ou_exact_step` (matrix exponential + diagonal diffusion variance)
3. **Coupled SIR strain step** — `_evolve_strains_step`; dominant strain activation feeds back into ideological (+0.04×max(I)) and engagement (+0.03×mean(I)) dimensions
4. Record states at horizon days; fan chart valence every 30 days

**Outputs per horizon:** median, mean, p10, p90; \(P(\text{valence}>0)\), \(P(\text{high arousal})\), \(P(\text{low stability})\), \(P(\text{high ideological})\); \(P(\text{valence sign flip})\); \(P(\text{regime persistence})\).

**Scenarios:** Terminal valence clustering → amplification / baseline continuity / pivot archetypes.

**Audit (`MonteCarloAudit`):** `paths_integrated`, `entropy_sources[]`, `mean_valence_spread`, 6 sample trajectories.

**Projection quality:**

\[
Q_{\text{base}} = 0.2 + 0.35 \cdot \min(n/40, 1) + 0.3 R^2 + 0.15 \bar{s}_{\text{strain}}
\]

\[
Q_{\text{overall}} = \clip(Q_{\text{base}} \cdot (0.7 + 0.3 A),\ 0.12,\ 0.9), \quad Q(H) = \clip(Q_{\text{overall}} \cdot e^{-H/\tau},\ 0,\ 0.95)
\]

```python
def run_monte_carlo(
    ou: OuParameters,
    current_state: np.ndarray,          # fused x₀
    horizons: list[int],                # from PROJECTION_HORIZONS_DAYS
    derived_inputs: np.ndarray,         # B·u driver vector
    n_simulations: int = 10000,         # clamped 10k–25k in config
    strains: list[PersonalR0Estimate],
    projection_quality: ProjectionQuality,
    dt_day: float = 1.0,
) -> FutureStateDistribution:
    """
    For each of n_simulations paths:
      1. Perturb α, σ, u, x₀, x*, strain β/γ (entropy sources)
      2. ou_exact_step() each day + SIR strain evolution + optional shocks
      3. Aggregate → HorizonDistribution per horizon + fan chart + scenarios
    """
    ...
```

---

### Generating the Future State Narrative

#### (as implemented) Dual LLM synthesis — `stage3_project.py`

The mathematical projection is interpreted through **two sequential LLM calls**:

**Call 1 — `FutureStateNarrative`** (`FUTURE_NARRATIVE_SYSTEM`):

Horizon prose constrained to Monte Carlo medians, behavioral profile, strain outlook, scenario probabilities. Must not contradict simulated medians.

Returns: `next_30_days`, `next_90_days`, `six_month_horizon`, optional `long_horizon`, `epistemic_limits`, `profile_context`, `strain_outlook`.

**Call 2 — `FutureGoalsOutlook`** (`FUTURE_GOALS_SYSTEM` — strategic goals agent):

Forward-looking goals and focus areas grounded in persona + projection context.

Returns (nested under `goals_outlook`):

- `strategic_summary`, `instagram_trajectory`
- `focus_areas[]` — `{area, rationale, confidence}`
- `likely_goals[]` — `{goal, timeframe, reasoning}`
- `reasoning_trace`

<details>
<summary>Original single-call narrative prompt (reference)</summary>

```python
async def generate_future_narrative(
    persona: PersonaModel,
    future: FutureStateDistribution,
    derived: DerivedSignals,
) -> FutureStateNarrative:
    
    prompt = f"""
You are synthesising a future state projection for a real person.
...
Generate a future state narrative with four sections:
1. THE NEXT 30 DAYS ...
2. THE NEXT 90 DAYS ...
3. THE 6-MONTH HORIZON ...
4. EPISTEMIC LIMITS ...
"""
    narrative = await call_llm_async(FUTURE_NARRATIVE_SYSTEM, prompt)
    return FutureStateNarrative(**narrative)
```

</details>

---

## The Complete Output

```python
class PersonaDynamicsReport(BaseModel):
    """
    The complete output of the Persona Dynamics Engine.
    """
    # Input
    profile_url: str
    username: str
    analysis_period_days: int
    posts_analysed: int
    
    # Stage 1: Signal extraction summary
    signal_summary: SignalSummary
    derived_signals: DerivedSignals
    signal_matrix: Optional[ProfileSignalMatrix]  # Full temporal matrix (when included)
    
    # Stage 2: Multi-agent debate outputs
    agent_hypotheses: list[AgentHypothesis]
    debate_record: DebateRecord
    persona_model: PersonaModel      # The synthesised persona after debate
    
    # Stage 3: Future state projection
    ou_parameters: OuParameters          # Fitted dynamical system parameters
    phase_portrait: PhasePortrait        # Psychological attractor structure (+ multi-slice)
    belief_strain_profiles: list[PersonalR0Estimate]  # Adaptive per-profile themes
    future_state: FutureStateDistribution  # MC horizons + audit + scenarios
    future_narrative: FutureStateNarrative  # Horizon prose + goals_outlook agent
    
    # Quality metrics
    data_quality_score: float        # 0-1: post volume, persona consistency, capture quality
    model_fit_r_squared: float       # OU pooled R²
    projection_confidence: dict[str, float]  # Per horizon from Q(H) decay
    
    # Mandatory ethical flags
    ethical_flags: list[str]         # e.g., ["limited_data_warning", "public_profile_only"]
    generated_at: datetime
```

---

## The End-to-End Worked Example

**Input:** `https://www.instagram.com/example_creator/`

**Stage 1 — Signal Extraction (365 days, 180 posts):**

```
Derived signals:
  Posting regularity:  0.42  (moderate irregular — reactive poster)
  Emotional volatility: 0.61  (high — emotionally activated content)
  Engagement slope:    -0.003  (slight decline over the year)
  Caption length slope: +2.1 words/post  (becoming more explanatory over time)
  Topic drift score:   0.58  (significant topic shift in the period)
  Burst events detected: 3  (3 periods of sudden posting acceleration)
  
  Burst event 1: September 2025 — 4x posting frequency increase for 2 weeks
  Burst event 2: January 2026   — 3x posting frequency increase for 10 days
  Burst event 3: April 2026     — 5x posting frequency increase for 3 weeks
```

**Stage 2 — Debate Council (selected outputs):**

```
PSYCHOGRAPHER initial hypothesis:
  "This person scores high on Neuroticism (emotional reactivity) and Openness to Experience,
   with moderate Conscientiousness. The three burst events correspond to external stressors
   they are processing publicly. Their increasing caption length indicates growing need
   for explanation and validation. Attachment style: anxious — they seek audience 
   validation but interpret silence as rejection (evidenced by posting frequency 
   spikes when engagement drops)."

SOCIOLOGIST challenge to PSYCHOGRAPHER:
  "The burst events do NOT necessarily indicate stress processing. Another explanation: 
   the burst events correspond to external world events (I checked dates) — September burst
   followed Tamil Nadu political developments, January burst followed a national economic
   announcement, April burst followed the Tamil Nadu election. This person may be an 
   externally-reactive commentator, not internally-processing their anxiety. Your 
   'anxious attachment' hypothesis is an over-psychologisation of what might simply be
   politically engaged commentary."

PSYCHOGRAPHER revised hypothesis (after challenge):
  "VALID challenge. Revising: the burst events are likely driven by external events, 
   not personal anxiety. HOWEVER, the increasing caption length trend is not explained 
   by external events — it's a consistent internal change suggesting growing need to 
   elaborate and justify positions. Revised: moderate Neuroticism (not high), politically 
   engaged commentator who is becoming more defensive/explanatory over time. 
   Revised confidence: 0.62 (down from 0.78)."
```

**Stage 3 — Future State Projection** (10,000-path Monte Carlo, adaptive narrative strains):

```
OU Parameters (fitted from 180 posts, calendar Δt):
  Equilibrium x* = [−0.12, 0.58, 0.61, 0.72, 0.48, 0.64]
  (slightly negative valence baseline, high arousal baseline, moderate-high stability,
   high connectivity, moderate engagement, high ideological intensity)
  
  Mean reversion rates (α diagonal):
  valence:    0.28 per day  (returns to baseline in ~3.5 days — fast emotional recovery)
  arousal:    0.12 per day  (returns in ~8 days — arousal persists longer)
  stability:  0.06 per day  (identity shifts are slow — 2-3 weeks to stabilise)
  
  fit_method: block_diagonal_calendar (or full_matrix_calendar if T ≥ 40)
  Model fit R² = 0.67  (moderate — person is moderately predictable)
  Fusion weight (measured): 0.55 → x₀ blends last post state + LLM persona state

Adaptive narrative strains (discovered from this profile's hashtags/captions — examples):
  #politics · #election: momentum r=1.6 → expanding (R₀=2.1 when SIR fit reliable)
  #fitness · #wellness: momentum r=0.5 → contracting
  (Labels are profile-specific — not fixed taxonomy keys)

Monte Carlo — 10,000 paths, horizons 30/90/180/365 days:
  Entropy: perturbed α, σ, B·u, x₀, x*, strain β/γ + engagement shocks
  Audit: paths_integrated=10000, mean_valence_spread≈0.18

Projection — T+30 days (80% credible interval):
  Valence:           −0.18  [−0.35, +0.04]   P(positive) = 31%
  Arousal:           0.64  [0.48, 0.79]       P(high arousal) = 72%
  Ideological intensity: 0.71 [0.58, 0.84]   P(high) = 68%

Projected content profile at T+30:
  "High probability of continued institutional failure framing, elevated emotional 
   activation, politically engaged content. If a significant external political or
   economic event occurs, expect a burst episode (3-5x posting frequency for 1-2 weeks).
   Low probability of positive/aspirational content shift."

Projection — T+90 days (wider uncertainty):
  P(major topic shift — away from current political focus): 28%
  P(continued political intensification): 44%
  P(reduced posting, disengagement phase): 28%

  "The topic drift score of 0.58 suggests this person is in or approaching a major 
   content transition. One of two paths is likely: deeper ideological commitment
   (institutional failure + political mobilisation narratives continue rising), or
   a sudden pivot triggered by personal life event. The stability dimension is the
   key variable to watch — it's currently declining (−0.003/day)."

Projection — T+180 days (scenario-based):
  
  Path A — CONTINUATION (44% probability):
  "Content intensifies politically. The person's equilibrium gradually shifts toward
   a higher ideological intensity baseline (current 0.64 → projected 0.71-0.78).
   They become a more committed political commentator, with declining audience diversity
   (increasing in-group, decreasing out-group followers). Engagement quality may decline
   as reach narrows but depth increases."
  
  Path B — DISRUPTION (56% probability — disruption here means departure from Path A):
  "A personal life event (relationship change, career change, geographic move), external
   political development that resolves or transforms their primary concerns, or simple
   burnout from high-arousal sustained content produces a significant trajectory shift.
   Most likely outcome: reduced posting frequency + content reframe toward personal/
   lifestyle content before eventual re-engagement with modified framing."
```

---

## Ethical Architecture

This system is designed around several non-negotiable ethical constraints:

**1. Public profile only.**
The system will not attempt to access private accounts, private stories, or any
content not voluntarily made public by the account holder. Instaloader respects
Instagram's public/private designation.

**2. No clinical diagnostic language.**
The system is explicitly prohibited from using language that implies clinical
psychological diagnosis. "This person exhibits high-Neuroticism traits" is acceptable.
"This person has anxiety disorder" is never acceptable. The persona model outputs
personality tendencies, not conditions.

**3. Confidence floors.**
Any claim with confidence < 0.4 is automatically flagged as "speculative" in the
output and cannot appear as a top-level persona assertion without a flag.

**4. Epistemic limits section is mandatory.**
Every report must include an explicit section on what cannot be determined from
Instagram data — what the profile might be hiding, what signals are absent, what
the model cannot see.

**5. The "absence of signal is not evidence of absence" rule.**
The synthesis agent is explicitly instructed that if a topic never appears in someone's
content, this means they have not chosen to discuss it publicly — it does not mean it
is not important to them. The model must not make strong claims based on absence.

**6. Data retention policy.**
Profile signal data is processed and discarded. No personal social media data is
stored in the database beyond anonymised aggregate statistics for model calibration.

---

## Summary: The Mathematical Spine

```
STAGE 1: SIGNAL EXTRACTION
  Observable = f(psychological state, cultural context, strategic choices, noise)
  
  We invert this: given observables, estimate the generating process.

STAGE 2: MULTI-AGENT DEBATE
  Persona = argmax P(Persona | Evidence) 
  
  Approximated via adversarial Bayesian updating:
  Each agent holds a prior P(Persona | Agent's framework)
  Debate forces revision: P(Persona | Evidence, Challenge, Defense)
  Synthesis produces posterior: P(Persona | All evidence, All frameworks, Resolved contradictions)

STAGE 3: FUTURE STATE PROJECTION

  3a. OU Process (psychological dynamics):
  dx = -α(x - x*)dt + B·u dt + σdW
  
  Discrete exact step (calendar Δt between posts for fit; dt=1 day in forward MC):
  x(t+Δt) = x* + e^{-αΔt}(x - x*) + B·u Δt + ε,  Var(ε_d) = σ_d²/(2α_dd)(1 - e^{-2α_dd Δt})
  
  Fit: variable-Δt diagonal AR(1) → block coupling → optional full matrix (T≥40)
  Anchor: x₀ = w·x_meas + (1-w)·x_LLM (Stage 2 fusion)

  3b. Adaptive narrative strains (not fixed taxonomy):
  Momentum r = mean(I_recent) / mean(I_early) → expanding | stable | contracting
  Optional SIR: dI/dt = β S I - γ I,  R₀ = β/γ (secondary, gated by fit R²)
  
  3c. Monte Carlo Integration (default N=10,000 paths):
  P(x(T) ∈ region | x₀, α, x*, σ, strains) ≈ (1/N) Σᵢ 𝟙[xᵢ(T) ∈ region]
  
  Entropy per path: lognormal α/σ/u, Gaussian x₀/x* noise, strain β/γ jitter, shocks
  Quality: Q(H) = Q_overall · exp(-H/τ),  Q_overall blends data coverage, R², strains, A
  
  3d. Dual LLM synthesis:
  FutureStateNarrative (horizon prose) + FutureGoalsOutlook (strategic goals agent)
  
  Provides full posterior distribution over future states,
  not point estimates — the right answer for an inherently uncertain question.
```

The mathematics says: people have attractors they return to, trajectories they follow,
narrative strains they amplify or shed. All of this is measurable from public behaviour.
None of it is perfectly predictable. The model's job is not to eliminate uncertainty
about who a person is and where they are going — it is to quantify that uncertainty
honestly, so that what can be known is known, and what cannot is clearly labelled as such.

That is the most honest thing a prediction system can do.
