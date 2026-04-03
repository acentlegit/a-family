import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/arakala-landing.css";

export default function ArakalaLanding() {
  const navigate = useNavigate();

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("visible");
          }
        });
      },
      { threshold: 0.15 }
    );

    const revealEls = document.querySelectorAll(".reveal");
    revealEls.forEach((el) => observer.observe(el));

    const dots = document.querySelectorAll<SVGCircleElement>(".location-dot");
    const cards = document.querySelectorAll<HTMLElement>(".location-card");
    const cleanups: Array<() => void> = [];

    dots.forEach((dot) => {
      const onEnter = () => {
        const name = dot.getAttribute("data-name") || "";
        cards.forEach((card) => {
          const strong = card.querySelector("strong");
          const text = strong?.textContent?.toLowerCase() || "";
          const match = text.includes(name.toLowerCase());

          card.style.transform = match ? "translateY(-6px)" : "";
          card.style.boxShadow = match ? "0 24px 55px rgba(0,0,0,.34)" : "";
          card.style.borderColor = match ? "rgba(255,255,255,.18)" : "";
        });
      };

      const onLeave = () => {
        cards.forEach((card) => {
          card.style.transform = "";
          card.style.boxShadow = "";
          card.style.borderColor = "";
        });
      };

      dot.addEventListener("mouseenter", onEnter);
      dot.addEventListener("mouseleave", onLeave);

      cleanups.push(() => {
        dot.removeEventListener("mouseenter", onEnter);
        dot.removeEventListener("mouseleave", onLeave);
      });
    });

    return () => {
      observer.disconnect();
      cleanups.forEach((fn) => fn());
    };
  }, []);

  return (
    <div className="arakala-page">
      <nav className="arakala-nav">
        <div className="arakala-container arakala-nav-inner">
          <a href="#top" className="arakala-brand">
            <span className="arakala-brand-mark">A</span>
            <span>Arakala</span>
          </a>

          <div className="arakala-nav-links">
            <a href="#journey">Journey</a>
            <a href="#timeline">Timeline</a>
            <a href="#family-tree">Family Tree</a>
            <button
              onClick={() => navigate("/login")}
              className="arakala-btn arakala-btn-primary arakala-nav-cta"
            >
              Enter Digital Arakala Family
            </button>
          </div>
        </div>
      </nav>

      <header className="arakala-hero" id="top">
        <div className="arakala-container arakala-hero-grid">
          <div className="reveal">
            <div style={{ marginBottom: 20 }}>
              <span className="arakala-badge">
                <span className="arakala-dot" />
                Origin in Khammam • Story across continents
              </span>
            </div>

            <h2 className="arakala-hero-headline">
              What began in Khammam now lives wherever family lives.
            </h2>

            <p className="arakala-hero-copy">
              The Arakala Family is not just a family — it is a reflection of values, experience, and togetherness, built on a strong foundation of shared principles.
            </p>

            <div className="arakala-hero-actions">
              <button
                onClick={() => navigate("/login")}
                className="arakala-btn arakala-btn-primary"
              >
                Enter Digital Arakala Family
              </button>
              <a href="#journey" className="arakala-btn arakala-btn-secondary">
                Explore the Story
              </a>
            </div>

            <div className="arakala-hero-meta">
              <span>✦ Heritage-first identity</span>
              <span>✦ Premium storytelling</span>
              <span>✦ Family connection across generations</span>
            </div>
          </div>

          <div className="arakala-hero-stage reveal">
            <div className="arakala-orb one" />
            <div className="arakala-orb two" />
            <div className="arakala-orb three" />

            <div className="arakala-story-overlay arakala-glass">
              <span className="arakala-badge">
                <span className="arakala-dot" />
                Arakala began here
              </span>
              <h3>Khammam is not just the origin. It is the emotional center.</h3>
              <p>
                The warmth of home, spoken language, shared meals, and generational memory all
                begin there. The platform exists to make sure that feeling is never lost, even
                as families move across the world.
              </p>
            </div>

            <div className="arakala-phone">
              <div className="arakala-phone-screen">
                <div className="arakala-screen-bar">
                  <span>Arakala</span>
                  <span className="arakala-pill">Family Story</span>
                </div>

                <div className="arakala-app-card">
                  <div className="arakala-app-head">
                    <div className="arakala-avatar">K</div>
                    <div>
                      <div className="arakala-app-title">Khammam Origins</div>
                      <div className="arakala-app-sub">Where the family story begins</div>
                    </div>
                  </div>

                  <div className="arakala-memory">
                    <div className="arakala-thumb" />
                    <div>
                      <div className="arakala-app-title">First family memories</div>
                      <div className="arakala-app-sub">
                        Moments shaped by home, roots, and belonging
                      </div>
                    </div>
                  </div>
                </div>

                <div className="arakala-app-card">
                  <div className="arakala-app-head">
                    <div className="arakala-avatar alt1">H</div>
                    <div>
                      <div className="arakala-app-title">Hyderabad Chapter</div>
                      <div className="arakala-app-sub">
                        Growth, movement, new opportunities
                      </div>
                    </div>
                  </div>

                  <div className="arakala-memory">
                    <div className="arakala-thumb alt1" />
                    <div>
                      <div className="arakala-app-title">Shared milestones</div>
                      <div className="arakala-app-sub">
                        Family life expanding while values stay rooted
                      </div>
                    </div>
                  </div>
                </div>

                <div className="arakala-app-card">
                  <div className="arakala-app-head">
                    <div className="arakala-avatar alt2">W</div>
                    <div>
                      <div className="arakala-app-title">World Family Circle</div>
                      <div className="arakala-app-sub">
                        Virginia, Melbourne, London, Canada
                      </div>
                    </div>
                  </div>

                  <div className="arakala-memory">
                    <div className="arakala-thumb alt2" />
                    <div>
                      <div className="arakala-app-title">Connected across continents</div>
                      <div className="arakala-app-sub">
                        One family identity, many homes, one digital place
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <section className="arakala-section" id="journey">
        <div className="arakala-container">
          <div className="arakala-section-head reveal">
            <p>
              Arakala carries a story of migration, continuity, and emotional closeness. The
              route begins in Khammam and expands into a global family presence.
            </p>
          </div>

          <div className="arakala-map-wrap arakala-glass reveal">
            <div className="arakala-map-grid">
              <div>
                <svg
                  className="arakala-world"
                  viewBox="0 0 1000 520"
                  aria-label="Arakala world journey map"
                >
                  <defs>
                    <linearGradient id="routeGradient" x1="0%" x2="100%">
                      <stop offset="0%" stopColor="#94a3b8" />
                      <stop offset="50%" stopColor="#cbd5e1" />
                      <stop offset="100%" stopColor="#60a5fa" />
                    </linearGradient>
                  </defs>

                  <rect x="0" y="0" width="1000" height="520" rx="28" fill="transparent" />

                  <path
                    className="arakala-continent"
                    d="M95 172 L180 120 L250 132 L300 174 L310 225 L270 250 L205 244 L150 214 L115 206 Z"
                  />
                  <path
                    className="arakala-continent"
                    d="M270 282 L320 298 L352 354 L334 430 L290 470 L246 452 L230 396 L244 328 Z"
                  />
                  <path
                    className="arakala-continent"
                    d="M445 110 L522 98 L612 120 L688 112 L770 148 L814 196 L794 236 L720 256 L655 247 L600 264 L548 245 L506 208 L458 170 Z"
                  />
                  <path
                    className="arakala-continent"
                    d="M585 270 L634 292 L665 340 L648 404 L602 438 L566 404 L552 350 Z"
                  />
                  <path
                    className="arakala-continent"
                    d="M805 338 L856 358 L886 390 L872 428 L823 440 L780 415 L772 374 Z"
                  />

                  <path className="arakala-route" d="M606 220 C 622 210, 648 195, 664 183" />
                  <path className="arakala-route" d="M606 220 C 700 185, 755 165, 825 170" />
                  <path className="arakala-route" d="M606 220 C 660 250, 740 300, 834 382" />
                  <path className="arakala-route" d="M606 220 C 480 190, 300 165, 180 170" />

                  <circle className="location-dot" cx="606" cy="220" r="7" data-name="Khammam" />
                  <circle
                    className="location-dot"
                    cx="664"
                    cy="183"
                    r="7"
                    data-name="Hyderabad / Kothagudem"
                  />
                  <circle
                    className="location-dot alt"
                    cx="180"
                    cy="170"
                    r="7"
                    data-name="Virginia"
                  />
                  <circle
                    className="location-dot alt"
                    cx="825"
                    cy="170"
                    r="7"
                    data-name="London"
                  />
                  <circle
                    className="location-dot alt"
                    cx="834"
                    cy="382"
                    r="7"
                    data-name="Melbourne"
                  />
                  <circle
                    className="location-dot alt"
                    cx="130"
                    cy="208"
                    r="7"
                    data-name="Canada"
                  />

                  <text className="arakala-map-label" x="620" y="212">
                    Khammam
                  </text>
                  <text className="arakala-map-label" x="675" y="176">
                    Hyderabad / Kothagudem
                  </text>
                  <text className="arakala-map-label" x="191" y="164">
                    Virginia
                  </text>
                  <text className="arakala-map-label" x="837" y="162">
                    London
                  </text>
                  <text className="arakala-map-label" x="845" y="395">
                    Melbourne
                  </text>
                  <text className="arakala-map-label" x="34" y="206">
                    Canada
                  </text>
                </svg>
              </div>

              <div className="arakala-map-side">
                <div className="arakala-location-card arakala-glass location-card">
                  <strong>Khammam, India</strong>
                  <span>
                    The emotional root. The place where the family story begins with language,
                    values, memory, and belonging.
                  </span>
                </div>

                <div className="arakala-location-card arakala-glass location-card">
                  <strong>Hyderabad / Kothagudem, India</strong>
                  <span>
                    The chapter of growth. A bridge between tradition and expanding opportunity.
                  </span>
                </div>

                <div className="arakala-location-card arakala-glass location-card">
                  <strong>Virginia, USA</strong>
                  <span>
                    A new home shaped by migration, while keeping identity alive across
                    generations.
                  </span>
                </div>

                <div className="arakala-location-card arakala-glass location-card">
                  <strong>Melbourne, Australia</strong>
                  <span>
                    A continuation of the family journey into a different world without losing
                    its roots.
                  </span>
                </div>

                <div className="arakala-location-card arakala-glass location-card">
                  <strong>London, UK &amp; Canada</strong>
                  <span>
                    Global branches of the same story — different places, shared heritage, one
                    Arakala identity.
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="arakala-section" id="timeline">
        <div className="arakala-container">
          <div className="arakala-section-head reveal">
            <p>
              Each chapter adds distance, but never separation. The story evolves, while the
              feeling of family stays the same.
            </p>
          </div>

            <div className="arakala-timeline-shell">
            <div className="arakala-timeline-track">
              <div className="arakala-timeline-item reveal">
                <div className="arakala-timeline-card arakala-glass">
                  <span className="arakala-timeline-year">Origin</span>
                  <h3>Khammam</h3>
                  <p>
                    Arakala begins in Khammam, where family life is built through shared time,
                    Telugu-speaking roots, community, and the quiet emotional habits that make a
                    home feel permanent.
                  </p>
                </div>
              </div>

              <div className="arakala-timeline-item reveal">
                <div className="arakala-timeline-card arakala-glass">
                  <span className="arakala-timeline-year">Expansion</span>
                  <h3>Hyderabad / Kothagudem</h3>
                  <p>
                    The next phase brings movement and opportunity. Family carries its values
                    forward, adapting to a larger city while staying anchored in the same
                    emotional center.
                  </p>
                </div>
              </div>

              <div className="arakala-timeline-item reveal">
                <div className="arakala-timeline-card arakala-glass">
                  <span className="arakala-timeline-year">Migration</span>
                  <h3>Across Continents</h3>
                  <p>
                    Virginia, Melbourne, London, and Canada become part of the family map.
                    Geography changes, but belonging does not. Home becomes something carried,
                    not left behind.
                  </p>
                </div>
              </div>

              <div className="arakala-timeline-item reveal">
                <div className="arakala-timeline-card arakala-glass">
                  <span className="arakala-timeline-year">Today</span>
                  <h3>Today</h3>
                  <p>
                    Today, the Arakala family rises from its roots in Khammam to across the world — 69 members strong — built on shared values and strengthened by 25 engineers, 6 doctors, distinguished doctorates, and 12 teachers, with representation in premier government services including the Indian Forest Service, Postal Services, the Indian Air Force, and the Indian Navy, alongside professionals in law, physical education, and pharmaceuticals — together reflecting centuries of combined experience and a lasting legacy.
                  </p>
                </div>
              </div>
            </div>

            <div className="arakala-family-panel arakala-glass reveal" id="family-tree">
              <span className="arakala-badge">
                <span className="arakala-dot" />
                Family tree visualization
              </span>

              <h3>One root. Many branches.</h3>

              <p>
                The Arakala story grows outward, but always from the same origin. This simple
                tree represents how one family identity continues through generations and across
                borders.
              </p>

              <div className="arakala-tree">
                <div className="arakala-tree-row">
                  <div className="arakala-person arakala-glass arakala-person-root">
                    <strong>Khammam Root</strong>
                    <span>Origin, culture, language, home</span>
                  </div>
                </div>

                <div className="arakala-tree-line" />
                <div className="arakala-tree-branch" />

                <div className="arakala-tree-row">
                <div className="arakala-person arakala-glass">
                  <strong>Hyderabad / Kothagudem</strong>
                    <span>Growth and transition</span>
                  </div>
                  <div className="arakala-person arakala-glass">
                    <strong>World Family</strong>
                    <span>Migration and continuity</span>
                  </div>
                </div>

                <div className="arakala-tree-line" />
                <div className="arakala-tree-branch" />

                <div className="arakala-tree-row">
                  <div className="arakala-person arakala-glass">
                    <strong>Virginia</strong>
                    <span>USA chapter</span>
                  </div>
                  <div className="arakala-person arakala-glass">
                    <strong>London</strong>
                    <span>UK chapter</span>
                  </div>
                  <div className="arakala-person arakala-glass">
                    <strong>Melbourne</strong>
                    <span>Australia chapter</span>
                  </div>
                  <div className="arakala-person arakala-glass">
                    <strong>Canada</strong>
                    <span>North America chapter</span>
                  </div>
                </div>
              </div>

              <div className="arakala-quote-panel arakala-glass">
                <p>“Arakala is the proof that family can grow outward without growing apart.”</p>
                <small>— Brand message</small>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="arakala-section" id="start">
        <div className="arakala-container">
          <div className="arakala-cta-panel reveal">
            <div className="arakala-cta-inner">
              <div className="arakala-cta-copy">
                <span className="arakala-badge">
                  <span className="arakala-dot" />
                  Begin the next chapter
                </span>
                <h3>Build a digital home worthy of your family story.</h3>
                <p>
                  This website brings together origin, identity, memory, and modern life — keeping your family’s journey, from Khammam to the world, alive in one timeless place.
                </p>
              </div>

              <div className="arakala-cta-actions">
                <button
                  onClick={() => navigate("/login")}
                  className="arakala-btn arakala-btn-primary"
                >
                  Enter Digital Arakala Family
                </button>
                <a href="#journey" className="arakala-btn arakala-btn-secondary">
                  Replay the Journey
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      <footer className="arakala-footer">
        <div className="arakala-container arakala-footer-inner">
          <div>© 2026 Arakala — What began in Khammam now lives wherever family lives.</div>
          <div>Contact: Chandra Arakala | 703 864 3760</div>
          <div className="arakala-footer-links">
            <a href="#">Origins</a>
            <a href="#">Family Story</a>
            <a href="#">Contact</a>
          </div>
        </div>
      </footer>
    </div>
  );
}

