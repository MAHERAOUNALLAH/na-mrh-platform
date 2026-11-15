// ============================================================
// client/src/components/CountriesBand.jsx
// Bandeau défilant des États membres (accueil) : drapeau + nom de
// chaque pays, lien vers /etats-membres.
//
// Premier élément animé du site : règles d'accessibilité (WCAG 2.2.2)
//   - bouton Pause (aria-pressed), arrêt au survol et au focus clavier
//     (CSS :hover / :focus-within) ;
//   - prefers-reduced-motion: reduce → AUCUNE animation, la liste réelle
//     s'affiche à l'arrêt et passe à la ligne ; bouton masqué (CSS) ;
//   - lecteurs d'écran : une seule <ul> réelle (un élément par pays) ;
//     les copies qui assurent le bouclage sont aria-hidden + inert, et
//     leurs liens hors de l'ordre de tabulation (tabIndex -1).
//
// Mouvement : CSS seulement (@keyframes countries-marquee dans
// index.css, transform: translateX). La piste contient N copies de la
// liste et se décale d'exactement une copie par cycle : le bouclage est
// sans trou ni saut. JavaScript ne fait que MESURER (ResizeObserver) pour
// choisir N (piste ≥ 2 × largeur de l'écran, N ≥ 2) et la durée
// (largeur d'une copie / vitesse). En arabe, --marquee-dir inverse le
// sens (défilement de gauche à droite).
// ============================================================

import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { pickLang } from '../utils/lang';
import Flag from './Flag';

// 40 px par seconde : un nom reste lisible plusieurs secondes même à
// 360 px (il traverse l'écran en ~9 s), sans donner l'impression d'attendre
// sur grand écran. Valeur unique, indépendante de la largeur de l'écran.
const SPEED_PX_PER_S = 40;

function CountryItems({ countries, lang, decorative }) {
  return countries.map((c) => (
    <li key={c.id}>
      <Link to="/etats-membres" className="marquee-item" tabIndex={decorative ? -1 : undefined}>
        <Flag code={c.id} width={40} height={30} />
        <span>{pickLang(c, 'name', lang)}</span>
      </Link>
    </li>
  ));
}

// Section complète : titre (modifiable, passé par l'accueil) + bouton
// Pause + bandeau. Pendant le chargement ou en cas d'erreur, `status`
// (le SectionStatus de l'accueil) occupe la hauteur réservée du bandeau.
function CountriesBand({ title, list, status }) {
  const ready = !list.loading && !list.error && list.data.length > 0;
  // Liste chargée mais vide : aucun bandeau (ni titre).
  if (!list.loading && !list.error && list.data.length === 0) return null;
  return (
    <section className="countries-band" aria-labelledby="countries-band-title">
      {ready ? (
        <Marquee title={title} countries={list.data} />
      ) : (
        <>
          <div className="container countries-band-head">
            <h2 id="countries-band-title">{title}</h2>
          </div>
          <div className="marquee-placeholder container">{status}</div>
        </>
      )}
    </section>
  );
}

function Marquee({ title, countries }) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const [paused, setPaused] = useState(false);
  const [layout, setLayout] = useState({ copies: 2, duration: 30 });
  const viewportRef = useRef(null);
  const realListRef = useRef(null);

  // Ordre alphabétique du nom dans la langue affichée (confort de lecture).
  const sorted = [...countries].sort((a, b) =>
    pickLang(a, 'name', lang).localeCompare(pickLang(b, 'name', lang), lang));

  // Mesures : nombre de copies et durée d'un cycle. Le setState a lieu
  // dans le rappel du ResizeObserver (jamais de façon synchrone dans
  // l'effet) ; il suit aussi le chargement des polices et la langue.
  useEffect(() => {
    const viewport = viewportRef.current;
    const list = realListRef.current;
    if (!viewport || !list || typeof ResizeObserver === 'undefined') return undefined;
    const measure = () => {
      const copyWidth = list.getBoundingClientRect().width;
      const screenWidth = viewport.getBoundingClientRect().width;
      if (!copyWidth || !screenWidth) return;
      const copies = Math.max(2, Math.ceil((2 * screenWidth) / copyWidth));
      const duration = Math.round((copyWidth / SPEED_PX_PER_S) * 10) / 10;
      setLayout((prev) => (prev.copies === copies && prev.duration === duration ? prev : { copies, duration }));
    };
    const observer = new ResizeObserver(measure);
    observer.observe(viewport);
    observer.observe(list);
    return () => observer.disconnect();
  }, []);

  // Focus clavier sur un lien à moitié sorti du cadre : l'animation est
  // déjà arrêtée (:focus-within) ; on la décale juste assez pour amener le
  // lien entier dans le cadre. Le navigateur ne peut pas le faire seul :
  // un lien parti à gauche est hors de la zone de défilement.
  const trackRef = useRef(null);
  function handleFocus(e) {
    const viewport = e.currentTarget;
    viewport.scrollLeft = 0;   // annule le défilement éventuel du navigateur
    const track = trackRef.current;
    const anim = track && track.getAnimations ? track.getAnimations()[0] : null;
    if (!anim || !anim.effect) return;
    const r = e.target.getBoundingClientRect();
    const v = viewport.getBoundingClientRect();
    const margin = 8;
    let shift = 0;                                   // décalage voulu (px, + = vers la droite)
    if (r.left < v.left + margin) shift = v.left + margin - r.left;
    else if (r.right > v.right - margin) shift = v.right - margin - r.right;
    if (!shift) return;
    const dir = getComputedStyle(track).getPropertyValue('--marquee-dir').trim() === '-1' ? -1 : 1;
    const period = anim.effect.getComputedTiming().duration;
    const t = ((Number(anim.currentTime) || 0) % period + period) % period;
    // Position de la piste : tx = -dir × vitesse × t, entre 0 et une copie.
    // Nouvelle position bornée à ce même intervalle (pas de repli modulo :
    // il ramènerait une copie, pas le lien réel focalisé).
    const copyWidth = (SPEED_PX_PER_S * period) / 1000;
    const tx = (-dir * SPEED_PX_PER_S * t) / 1000 + shift;
    const clamped = dir === 1 ? Math.min(0, Math.max(-copyWidth, tx)) : Math.max(0, Math.min(copyWidth, tx));
    anim.currentTime = (-dir * clamped * 1000) / SPEED_PX_PER_S;
  }

  // Une fois le focus sorti du bandeau, on remet sa position de défilement
  // à zéro (le navigateur a pu la décaler pour montrer un lien focalisé).
  function handleBlur(e) {
    if (!e.currentTarget.contains(e.relatedTarget)) e.currentTarget.scrollLeft = 0;
  }

  const copies = Array.from({ length: layout.copies - 1 }, (_, i) => i + 1);

  return (
    <>
      <div className="container countries-band-head">
        <h2 id="countries-band-title">{title}</h2>
        {/* Bouton à bascule : libellé fixe « Pause », état porté par
            aria-pressed (true = défilement arrêté) ; l'icône change. */}
        <button
          type="button"
          className="marquee-toggle"
          aria-pressed={paused}
          onClick={() => setPaused((p) => !p)}
        >
          <span className="marquee-toggle-icon" aria-hidden="true">{paused ? '▶' : '❚❚'}</span>
          <span>{t('homePage.marqueePause')}</span>
        </button>
      </div>

      <div
        className="marquee"
        role="group"
        aria-label={t('homePage.marqueeLabel')}
        data-paused={paused ? 'true' : 'false'}
        ref={viewportRef}
        onFocus={handleFocus}
        onBlur={handleBlur}
      >
        <div
          className="marquee-track"
          ref={trackRef}
          style={{ '--marquee-copies': layout.copies, '--marquee-duration': `${layout.duration}s` }}
        >
          <ul className="marquee-list" ref={realListRef}>
            <CountryItems countries={sorted} lang={lang} />
          </ul>
          {copies.map((n) => (
            <ul className="marquee-list marquee-copy" key={n} aria-hidden="true" inert>
              <CountryItems countries={sorted} lang={lang} decorative />
            </ul>
          ))}
        </div>
      </div>
    </>
  );
}

export default CountriesBand;
