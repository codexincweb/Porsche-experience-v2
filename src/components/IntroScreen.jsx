export default function IntroScreen({ onEnter }) {
  return (
    <section className="intro-screen" aria-labelledby="intro-title">
      <div className="intro-topline">
        <span>PORSCHE EXPERIENCE</span>
        <span>AN INDEPENDENT 911 GT3 RS STUDY</span>
      </div>

      <div className="intro-copy">
        <p className="eyebrow">TEN CHAPTERS</p>
        <h1 id="intro-title">
          GATHERING
          <br />
          <em>THE LIGHT.</em>
        </h1>
        <p className="intro-description">
          The 911 GT3 RS in its design, its air, its engine, and as a field of particles you can push around.
        </p>
      </div>

      <div className="intro-bottom">
        <div className="intro-note">
          <span className="note-line" />
          <span>HEADPHONES RECOMMENDED</span>
        </div>
        <div className="entry-actions">
          <button className="enter-button enter-primary" onClick={() => onEnter(true)}>
            ENTER WITH SOUND <span aria-hidden="true">↗</span>
          </button>
          <button className="enter-button" onClick={() => onEnter(false)}>
            ENTER WITHOUT SOUND <span aria-hidden="true">↗</span>
          </button>
        </div>
        <span className="intro-index">01 / 10</span>
      </div>
      <div className="vertical-label">STUTTGART · GERMANY</div>
    </section>
  );
}
