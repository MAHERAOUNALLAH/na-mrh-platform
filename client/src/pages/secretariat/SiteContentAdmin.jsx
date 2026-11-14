// ============================================================
// client/src/pages/secretariat/SiteContentAdmin.jsx
// Onglet « Contenu du site » de l'Espace Secrétariat — textes de
// l'accueil, de la page Gouvernance, du pied de page, de la page
// Confidentialité et coordonnées du Secrétariat, langue par langue.
//
// UNE SOUS-PAGE PAR SUJET : /secretariat/contenu-du-site/<slug>
// (sous-points dans le menu de gauche, voir siteContentParts.js).
//   - SiteContentAdmin (parent, route contenu-du-site) charge les données
//     UNE fois et les passe aux sous-pages par <Outlet context> : changer
//     de sous-point ne relance aucun appel ;
//   - SiteContentPart (une par sous-point) n'affiche que ses champs, en
//     groupes repliables (<details>) : au départ, les groupes qui
//     contiennent déjà une modification enregistrée, sinon le premier ;
//   - modifications non enregistrées : confirmation (window.confirm) avant
//     de suivre un lien qui quitte la sous-page, et avertissement du
//     navigateur avant de fermer ou recharger l'onglet ;
//   - LegacySiteContentRedirect : l'ancienne adresse /secretariat/accueil
//     (et ses ancres #cs-…) renvoie vers la sous-page correspondante.
//
// Principe : la base ne stocke que des SURCHARGES. Chaque champ est
// pré-rempli avec la valeur actuelle (surcharge ou texte par défaut des
// locales). À l'enregistrement, une langue dont le texte est identique
// au texte par défaut n'est PAS stockée : elle reste « par défaut » et
// suivra donc les futures corrections des fichiers de traduction.
//
// Lecture : GET /api/admin/site-content (registre des champs + surcharges)
// Écriture : PUT /api/admin/site-content/:key ; restauration : DELETE.
// Tout s'affiche comme du texte (jamais de HTML).
// ============================================================

import { useState, useEffect, useCallback, useRef } from 'react';
import { Navigate, Outlet, useLocation, useOutletContext } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import { useSiteContent } from '../../context/SiteContentContext';
import { SITE_CONTENT_DEFAULTS } from '../../utils/siteContentDefaults';
import { apiGet, apiPut, apiDelete } from '../../utils/api';
import { SITE_CONTENT_PARTS, partPath } from './siteContentParts';

const LANGS = [
  { code: 'fr', column: 'valueFr', dir: 'ltr' },
  { code: 'en', column: 'valueEn', dir: 'ltr' },
  { code: 'ar', column: 'valueAr', dir: 'rtl' },
];

// Sous-points, groupes et champs : siteContentParts.js.

// Aide affichée sous le titre de certains champs (clés adminHome.fieldHelp.*).
// Les deux listes de partenaires sont indépendantes : on le rappelle sur chacune.
const FIELD_HELP = {
  'governance.partnersList': 'listsIndependent',
  'footer.partnersList': 'listsIndependent',
  'footer.copyright': 'copyright',
  'privacy.body': 'privacyBody',
};

// Signale au parent qu'un champ a (ou n'a plus) des modifications non
// enregistrées. Rien d'affiché : le parent ne s'en sert qu'au moment de
// quitter la sous-page (ref, pas d'état → aucun nouveau rendu).
function useDirtyReport(key, dirty) {
  const { markDirty } = useOutletContext();
  useEffect(() => { markDirty(key, dirty); }, [markDirty, key, dirty]);
  useEffect(() => () => markDirty(key, false), [markDirty, key]);
}

// Libellé d'un lien interne = libellé du menu correspondant.
const LINK_LABELS = {
  '/': 'nav.home', '/gouvernance': 'nav.governance', '/etats-membres': 'nav.members',
  '/groupes-de-travail': 'nav.twgs', '/bibliotheque': 'nav.library', '/portail-rims': 'nav.portal',
  '/actualites': 'nav.news', '/contact': 'nav.contact', '/reclamations': 'nav.complaints',
};

const labelKey = (key) => `adminHome.fields.${key.replace(/\./g, '_')}`;

// Message (succès / erreur) d'un champ
function FieldStatus({ status }) {
  if (!status) return null;
  return (
    <p className={status.ok ? 'form-msg form-msg-ok' : 'form-msg form-msg-error'} role={status.ok ? 'status' : 'alert'}>
      {status.text}
    </p>
  );
}

// Liste saisie dans une zone de texte : un élément par ligne, espaces
// retirés, lignes vides ignorées (même règle que le serveur).
const listItems = (v) => v.split('\n').map((item) => item.trim()).filter(Boolean);

// Aide d'un champ (sous son titre) : texte propre au champ, et rappel des
// règles pour une liste.
function FieldHelp({ field }) {
  const { t } = useTranslation();
  const own = FIELD_HELP[field.key];
  return (
    <>
      {field.kind === 'list' && (
        <p className="content-field-help">{t('adminHome.listHelp', { max: field.maxItems, len: field.maxItemLength })}</p>
      )}
      {own && <p className="content-field-help">{t(`adminHome.fieldHelp.${own}`, { year: new Date().getFullYear() })}</p>}
    </>
  );
}

// ---------- Champ traduit (FR / EN / AR) : texte ou liste ----------
function TextFieldEditor({ field, override: loaded, onSaved }) {
  const { t, i18n } = useTranslation();
  const { token } = useAuth();
  // Surcharge renvoyée par le dernier enregistrement (null = plus de
  // surcharge) : elle sert de référence tout de suite, sans attendre la
  // relecture des données — sinon, juste après « Enregistrer », le champ
  // passerait encore pour non enregistré.
  const [justSaved, setJustSaved] = useState(undefined);
  const override = justSaved !== undefined ? justSaved : loaded;
  const isList = field.kind === 'list';
  // Long texte (privacy.body) : grand champ, confortable sur mobile.
  const isLong = field.maxLength > 2000;
  // Liste : défaut = tableau des locales, présenté un élément par ligne.
  // emptyDefault : aucun texte par défaut (la page publique affiche alors
  // son message d'attente).
  const defaultIn = (code) => {
    if (field.emptyDefault) return '';
    const fixedT = i18n.getFixedT(code);
    if (!isList) return fixedT(field.key);
    const items = fixedT(field.key, { returnObjects: true });
    return Array.isArray(items) ? items.join('\n') : '';
  };
  const defaults = Object.fromEntries(LANGS.map((l) => [l.code, defaultIn(l.code)]));
  // Valeur enregistrée (surcharge, sinon défaut) : point de comparaison des
  // modifications non enregistrées.
  const saved = Object.fromEntries(LANGS.map((l) => [l.code, (override && override[l.column]) || defaults[l.code]]));
  const [values, setValues] = useState(saved);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState(null);

  const norm = (v) => (isList ? listItems(v).join('\n') : v.trim());
  const isCustom = (code) => norm(values[code]) !== '' && norm(values[code]) !== norm(defaults[code]);
  const savedCustom = LANGS.filter((l) => override && override[l.column]).map((l) => l.code);
  const notModified = LANGS.filter((l) => !savedCustom.includes(l.code)).map((l) => l.code.toUpperCase());
  // Champ vidé = valeur par défaut (c'est ce que l'enregistrement donnerait).
  useDirtyReport(field.key, LANGS.some((l) => (norm(values[l.code]) || norm(defaults[l.code])) !== norm(saved[l.code])));
  // Badge d'une langue sans texte ni défaut (privacy.body) : « Non publié ».
  const badge = (code) => {
    if (isCustom(code)) return t('adminHome.badgeCustom');
    return field.emptyDefault ? t('adminHome.badgeNotPublished') : t('adminHome.badgeDefault');
  };

  function save(e) {
    e.preventDefault();
    setSaving(true);
    setStatus(null);
    // Langue identique au texte par défaut (ou vide) → null : pas de surcharge.
    const body = Object.fromEntries(LANGS.map((l) => [l.column, isCustom(l.code) ? norm(values[l.code]) : null]));
    apiPut(`/api/admin/site-content/${encodeURIComponent(field.key)}`, token, body)
      .then((row) => { setJustSaved(row && !row.restored ? row : null); setStatus({ ok: true, text: t('adminHome.saved') }); onSaved(); })
      .catch((err) => setStatus({ ok: false, text: err.message }))
      .finally(() => setSaving(false));
  }

  function restore() {
    setSaving(true);
    setStatus(null);
    apiDelete(`/api/admin/site-content/${encodeURIComponent(field.key)}`, token)
      .then(() => {
        setJustSaved(null);
        setValues(defaults);
        setStatus({ ok: true, text: t('adminHome.restored') });
        onSaved();
      })
      .catch((err) => setStatus({ ok: false, text: err.message }))
      .finally(() => setSaving(false));
  }

  return (
    <form className="content-field" onSubmit={save} aria-labelledby={`cft-${field.key}`}>
      <h5 id={`cft-${field.key}`}>{t(labelKey(field.key))}</h5>
      <FieldHelp field={field} />
      {LANGS.map((l) => {
        const id = `cf-${field.key}-${l.code}`;
        const Input = field.multiline || isList ? 'textarea' : 'input';
        const items = isList ? listItems(values[l.code]) : null;
        const tooLong = isList ? items.findIndex((item) => item.length > field.maxItemLength) : -1;
        return (
          <div key={l.code} className="field">
            <label htmlFor={id}>{t(`langNames.${l.code}`)}</label>
            <Input
              id={id} lang={l.code} dir={l.dir}
              {...(isList ? { rows: 8 } : isLong ? { rows: 14, className: 'content-long' } : field.multiline ? { rows: 3 } : { type: 'text' })}
              {...(isList ? {} : { maxLength: field.maxLength })}
              value={values[l.code]}
              onChange={(e) => setValues((prev) => ({ ...prev, [l.code]: e.target.value }))}
            />
            <div className="content-field-meta">
              <span className={isCustom(l.code) ? 'content-badge custom' : 'content-badge'}>
                {badge(l.code)}
              </span>
              <span aria-live="polite">
                {isList
                  ? t('adminHome.listCounter', { count: items.length, max: field.maxItems })
                  : t('adminHome.counter', { count: values[l.code].length, max: field.maxLength })}
              </span>
            </div>
            {/* Contrôle à la saisie (le serveur refuse de toute façon). */}
            {isList && items.length > field.maxItems && (
              <p className="content-field-warning" role="status">{t('adminHome.listTooMany', { max: field.maxItems })}</p>
            )}
            {tooLong >= 0 && (
              <p className="content-field-warning" role="status">{t('adminHome.listItemTooLong', { n: tooLong + 1, max: field.maxItemLength })}</p>
            )}
          </div>
        );
      })}
      {savedCustom.length > 0 && notModified.length > 0 && (
        <p className="content-field-warning">{t('adminHome.notModifiedIn', { langs: notModified.join(', ') })}</p>
      )}
      <div className="form-actions">
        <button type="submit" className="btn btn-primary btn-sm" disabled={saving}>{saving ? '…' : t('adminHome.save')}</button>
        <button type="button" className="btn btn-outline btn-sm" onClick={restore} disabled={saving || !override}>
          {t('adminHome.restore')}
        </button>
      </div>
      <FieldStatus status={status} />
    </form>
  );
}

// ---------- Valeur sans langue (e-mail, téléphone, nombre, lien) ----------
function ValueFieldEditor({ field, override: loaded, onSaved }) {
  const { t } = useTranslation();
  const { token } = useAuth();
  const [justSaved, setJustSaved] = useState(undefined);   // voir TextFieldEditor
  const override = justSaved !== undefined ? justSaved : loaded;
  const def = SITE_CONTENT_DEFAULTS[field.key];
  const [value, setValue] = useState((override && override.value) || def);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState(null);
  const id = `cf-${field.key}`;
  const isCustom = value.trim() !== '' && value.trim() !== def;
  useDirtyReport(field.key, (value.trim() || def) !== ((override && override.value) || def));

  function save(e) {
    e.preventDefault();
    setSaving(true);
    setStatus(null);
    let body;
    if (!isCustom) body = { value: null };
    else if (field.kind === 'int') body = { value: Number(value) };
    else body = { value };
    apiPut(`/api/admin/site-content/${encodeURIComponent(field.key)}`, token, body)
      .then((row) => {
        setJustSaved(row && !row.restored ? row : null);
        if (row && row.value) setValue(row.value);   // ex. e-mail remis en minuscules par le serveur
        setStatus({ ok: true, text: t('adminHome.saved') });
        onSaved();
      })
      .catch((err) => setStatus({ ok: false, text: err.message }))
      .finally(() => setSaving(false));
  }

  function restore() {
    setSaving(true);
    setStatus(null);
    apiDelete(`/api/admin/site-content/${encodeURIComponent(field.key)}`, token)
      .then(() => { setJustSaved(null); setValue(def); setStatus({ ok: true, text: t('adminHome.restored') }); onSaved(); })
      .catch((err) => setStatus({ ok: false, text: err.message }))
      .finally(() => setSaving(false));
  }

  const common = { id, value, onChange: (e) => setValue(e.target.value) };
  let input;
  if (field.kind === 'link') {
    input = (
      <select {...common}>
        {field.options.map((path) => <option key={path} value={path}>{t(LINK_LABELS[path])} ({path})</option>)}
      </select>
    );
  } else if (field.kind === 'int') {
    input = <input {...common} type="number" inputMode="numeric" min={field.min} max={field.max} step="1" dir="ltr" required />;
  } else if (field.kind === 'email') {
    input = <input {...common} type="email" name="email" dir="ltr" maxLength={254} required />;
  } else {
    input = <input {...common} type="tel" name="phone" dir="ltr" maxLength={30} required />;
  }

  return (
    <form className="content-field" onSubmit={save}>
      <div className="field">
        <label htmlFor={id}>{t(labelKey(field.key))}</label>
        {input}
        <div className="content-field-meta">
          <span className={isCustom ? 'content-badge custom' : 'content-badge'}>
            {isCustom ? t('adminHome.badgeCustom') : t('adminHome.badgeDefault')}
          </span>
          {field.kind === 'int' && <span>{t('adminHome.intRange', { min: field.min, max: field.max })}</span>}
        </div>
      </div>
      <div className="form-actions">
        <button type="submit" className="btn btn-primary btn-sm" disabled={saving}>{saving ? '…' : t('adminHome.save')}</button>
        <button type="button" className="btn btn-outline btn-sm" onClick={restore} disabled={saving || !override}>
          {t('adminHome.restore')}
        </button>
      </div>
      <FieldStatus status={status} />
    </form>
  );
}

// ---------- Sections affichées ou masquées ----------
function VisibilityEditor({ ids, overrides, onSaved }) {
  const { t } = useTranslation();
  const { token } = useAuth();
  const [saving, setSaving] = useState(null);   // clé en cours d'enregistrement
  const [status, setStatus] = useState(null);
  const shown = (k) => !(overrides[`home.show.${k}`] && overrides[`home.show.${k}`].value === 'false');
  const shownCount = ids.filter(shown).length;

  function toggle(k) {
    const next = !shown(k);
    setSaving(k);
    setStatus(null);
    // Afficher = valeur par défaut : on supprime la surcharge plutôt que d'écrire true.
    const request = next
      ? apiDelete(`/api/admin/site-content/home.show.${k}`, token)
      : apiPut(`/api/admin/site-content/home.show.${k}`, token, { value: false });
    request
      .then(() => { setStatus({ ok: true, text: t('adminHome.saved') }); onSaved(); })
      .catch((err) => setStatus({ ok: false, text: err.message }))
      .finally(() => setSaving(null));
  }

  return (
    <fieldset className="content-field">
      <legend>{t('adminHome.sectionsLegend')}</legend>
      <p className="content-field-help">{t('adminHome.sectionsHelp')}</p>
      <div className="check-options">
        {ids.map((k) => {
          // La dernière section affichée ne peut pas être décochée.
          const locked = shown(k) && shownCount === 1;
          return (
            <label key={k} className="check-option">
              <input type="checkbox" checked={shown(k)} disabled={saving !== null || locked} onChange={() => toggle(k)} />
              {t(`adminHome.sections.${k}`)}
            </label>
          );
        })}
      </div>
      {shownCount === 1 && <p className="content-field-warning">{t('adminHome.lastSection')}</p>}
      <FieldStatus status={status} />
    </fieldset>
  );
}

// ---------- Parent : données chargées une fois pour tous les sous-points ----------
function SiteContentAdmin() {
  const { t } = useTranslation();
  const { token } = useAuth();
  const { reload: reloadSite } = useSiteContent();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  // Champs modifiés et non enregistrés de la sous-page affichée (clés).
  const dirty = useRef(new Set());

  // Pas de setState synchrone dans l'effet (règle react-hooks/set-state-in-effect).
  const load = useCallback(() => {
    return apiGet('/api/admin/site-content', token)
      .then((d) => { setData(d); setError(null); })
      .catch((err) => setError(err.message));
  }, [token]);

  useEffect(() => { load(); }, [load]);

  // Après chaque enregistrement : relire les surcharges ici ET sur le site public.
  const onSaved = useCallback(() => { load(); reloadSite(); }, [load, reloadSite]);

  const markDirty = useCallback((key, isDirty) => {
    if (isDirty) dirty.current.add(key);
    else dirty.current.delete(key);
  }, []);

  // Modifications non enregistrées. Le routeur (BrowserRouter) ne sait pas
  // bloquer une navigation : on intercepte, en phase de CAPTURE sur le
  // document (donc avant React Router), le clic sur un lien interne qui
  // change de page — sous-point, autre onglet du menu, lien du site. Si
  // l'administrateur refuse, le clic est annulé. Fermer ou recharger
  // l'onglet : avertissement standard du navigateur (beforeunload).
  useEffect(() => {
    function onClick(e) {
      if (!dirty.current.size || e.defaultPrevented || e.button !== 0) return;
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;   // nouvel onglet / fenêtre
      const a = e.target instanceof Element ? e.target.closest('a[href]') : null;
      if (!a || (a.target && a.target !== '_self') || a.hasAttribute('download')) return;
      const url = new URL(a.href, window.location.href);
      if (url.origin !== window.location.origin) return;   // site extérieur : beforeunload s'en charge
      if (url.pathname === window.location.pathname) return;   // même page (ancre)
      if (!window.confirm(t('adminHome.unsavedConfirm'))) {
        e.preventDefault();
        e.stopPropagation();
      }
    }
    function onBeforeUnload(e) {
      if (!dirty.current.size) return;
      e.preventDefault();
      e.returnValue = '';
    }
    document.addEventListener('click', onClick, true);
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => {
      document.removeEventListener('click', onClick, true);
      window.removeEventListener('beforeunload', onBeforeUnload);
    };
  }, [t]);

  if (error && !data) return <p className="form-msg form-msg-error" role="alert">{error}</p>;
  if (!data) return <p>{t('common.loading')}</p>;

  const fields = Object.fromEntries(data.fields.map((f) => [f.key, f]));
  const overrides = Object.fromEntries(data.overrides.map((o) => [o.key, o]));

  return (
    <div className="content-admin">
      <Outlet context={{ fields, overrides, onSaved, markDirty }} />
    </div>
  );
}

// ---------- Sous-point : un sujet, ses groupes repliables ----------
export function SiteContentPart({ partId }) {
  const { t } = useTranslation();
  const { fields, overrides, onSaved } = useOutletContext();
  const part = SITE_CONTENT_PARTS.find((p) => p.id === partId);

  // Groupes ouverts au départ : ceux qui contiennent déjà une modification
  // enregistrée ; à défaut, le premier. Calculé une fois (à l'arrivée sur la
  // sous-page) : un enregistrement n'ouvre ni ne ferme rien ensuite, et un
  // groupe replié garde sa saisie (son contenu reste monté).
  const [initiallyOpen] = useState(() => {
    const withChanges = part.groups.filter((g) => g.keys.some((k) => overrides[k])).map((g) => g.id);
    return new Set(withChanges.length ? withChanges : [part.groups[0].id]);
  });

  return (
    <section aria-labelledby="cs-part-title">
      <div className="content-part-head">
        <h3 id="cs-part-title">{t(`adminHome.parts.${part.id}`)}</h3>
        <a className="content-view-link" href={part.view} target="_blank" rel="noopener noreferrer" aria-label={t('adminHome.viewPageLabel')}>
          {t('adminHome.viewPage')}
        </a>
      </div>
      <p className="admin-intro">{t(`adminHome.intros.${part.id}`)}</p>

      {part.visibility && <VisibilityEditor ids={part.visibility} overrides={overrides} onSaved={onSaved} />}

      {part.groups.map((group) => {
        const keys = group.keys.filter((k) => fields[k]);
        const changed = keys.some((k) => overrides[k]);
        return (
          <details key={group.id} className="content-group" open={initiallyOpen.has(group.id)}>
            <summary>
              <span className="content-group-title">{t(`adminHome.groups.${group.id}`)}</span>
              {changed && <span className="content-badge custom">{t('adminHome.badgeCustom')}</span>}
            </summary>
            <div className="content-group-body">
              {group.help && <p className="content-field-help">{t(`adminHome.groupHelp.${group.id}`)}</p>}
              {keys.map((k) => {
                const f = fields[k];
                const o = overrides[k];
                // Clé stable : l'éditeur garde sa saisie et son message après un
                // enregistrement ; seul l'état « modifié / par défaut » est relu.
                return f.kind === 'text' || f.kind === 'list'
                  ? <TextFieldEditor key={k} field={f} override={o} onSaved={onSaved} />
                  : <ValueFieldEditor key={k} field={f} override={o} onSaved={onSaved} />;
              })}
            </div>
          </details>
        );
      })}
    </section>
  );
}

// ---------- Ancienne adresse /secretariat/accueil ----------
// Les anciennes ancres du sommaire (#cs-footer…) mènent au bon sous-point.
export function LegacySiteContentRedirect() {
  const { hash } = useLocation();
  const part = SITE_CONTENT_PARTS.find((p) => hash === `#cs-${p.id}`) || SITE_CONTENT_PARTS[0];
  return <Navigate to={partPath(part)} replace />;
}

export default SiteContentAdmin;
