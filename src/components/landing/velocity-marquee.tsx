const WORDS = [
  { text: 'Where Velocity', gold: false },
  { text: 'Meets Vision', gold: true },
  { text: 'Cinematic Speed', gold: false },
  { text: 'Editorial Craft', gold: true },
];

/**
 * Velocity marquee strip — decorative editorial taglines. The experience island
 * makes its direction + speed react to scroll velocity.
 */
export function VelocityMarquee() {
  const run = [...WORDS, ...WORDS];

  return (
    <div className="vstrip" aria-hidden="true">
      <div className="vtrack" data-marquee-v>
        {run.map((w, i) => (
          <span key={i} className={w.gold ? 'gold' : undefined}>
            {w.text}
            <span className="star"> ✦ </span>
          </span>
        ))}
      </div>
    </div>
  );
}
