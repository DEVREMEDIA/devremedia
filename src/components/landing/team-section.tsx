import { getTranslations } from 'next-intl/server';
import Image from 'next/image';
import { richAccent } from './rich';

export async function TeamSection() {
  const t = await getTranslations('landing');

  const members = [
    {
      name: t('team.harisName'),
      role: t('team.harisRole'),
      bio: t('team.harisBio'),
      photo: '/images/team/haris.jpg',
      socials: [{ label: 'Instagram', href: 'https://www.instagram.com/haris_devre_/' }],
    },
    {
      name: t('team.angelosName'),
      role: t('team.angelosRole'),
      bio: t('team.angelosBio'),
      photo: '/images/team/angelos.jpg',
      socials: [
        { label: 'Instagram', href: 'https://www.instagram.com/a.devre/' },
        { label: 'TikTok', href: 'https://www.tiktok.com/@a.devre' },
        { label: 'LinkedIn', href: 'https://www.linkedin.com/in/angelos-devrentlis-28387894' },
      ],
    },
  ];

  return (
    <section className="section" id="team" aria-labelledby="team-heading">
      <div className="wrap">
        <div className="sec-head">
          <div className="meta">
            <span className="eyebrow">{t('team.label')}</span>
            <h2 id="team-heading" className="sec-title" data-l5-title>
              {t.rich('team.title', richAccent)}
            </h2>
          </div>
          <span className="secnum">07</span>
        </div>

        <p className="sec-lead" data-reveal>
          {t('team.description')}
        </p>

        <div className="team-grid">
          {members.map((m) => (
            <article className="team-card" key={m.name} data-reveal>
              <div className="team-photo">
                <Image
                  src={m.photo}
                  alt={`${m.name} — ${m.role}`}
                  fill
                  sizes="160px"
                  className="object-top"
                />
              </div>
              <div>
                <h3>{m.name}</h3>
                <div className="role">{m.role}</div>
                <p>{m.bio}</p>
                <div className="contact-socials" style={{ marginTop: 18 }}>
                  {m.socials.map((s) => (
                    <a key={s.label} href={s.href} target="_blank" rel="noopener noreferrer">
                      {s.label}
                    </a>
                  ))}
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
