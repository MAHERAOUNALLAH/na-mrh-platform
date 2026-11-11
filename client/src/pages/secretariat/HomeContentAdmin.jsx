// ============================================================
// client/src/pages/secretariat/HomeContentAdmin.jsx
// Onglet « Page d'accueil » — textes de l'accueil et coordonnées du
// Secrétariat, modifiables langue par langue.
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

import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import { useSiteContent } from '../../context/SiteContentContext';
import { SITE_CONTENT_DEFAULTS } from '../../utils/siteContentDefaults';
import { apiGet, apiPut, apiDelete } from '../../utils/api';

const LANGS = [
  { code: 'fr', column: 'valueFr', dir: 'ltr' },
  { code: 'en', column: 'valueEn', dir: 'ltr' },
  { code: 'ar', column: 'valueAr', dir: 'rtl' },
];

// Ordre d'affichage : un groupe = une section de l'accueil (ou les coordonnées).
const GROUPS = [
  { id: 'hero', keys: ['hero.kicker', 'hero.h1', 'hero.lead', 'hero.cta1', 'hero.cta1Link', 'hero.cta2', 'hero.cta2Link'] },
  { id: 'stats', keys: ['statsLabels.0', 'statsLabels.1', 'statsLabels.2', 'home.stat3Value', 'statsLabels.3', 'home.stat4Value'] },
  { id: 'mission', keys: ['homeSections.missionKicker', 'homeSections.missionH', 'homeSections.missionP', 'homeSections.countriesH'] },
  { id: 'twgs', keys: ['homeSections.twgKicker', 'homeSections.twgH', 'homeSections.twgP'] },
  { id: 'news', keys: ['homeSections.newsKicker', 'homeSections.newsH'] },
  { id: 'contact', keys: ['contact.email', 'contact.phone', 'contactPage.secP', 'footer.contactP', 'governance.secretariatD'] },
];
const SHOW_KEYS = ['stats', 'mission', 'countries', 'twgs', 'news'];

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

// ---------- Champ de texte traduit (FR / EN / AR) ----------
function TextFieldEditor({ field, override, onSaved }) {
  const { t, i18n } = useTranslation();
  const { token } = useAuth();
  const defaults = Object.fromEntries(LANGS.map((l) => [l.code, i18n.getFixedT(l.code)(field.key)]));
  const [values, setValues] = useState(() => Object.fromEntries(LANGS.map((l) => [l.code, (override && override[l.column]) || defaults[l.code]])));
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState(null);

  const isCustom = (code) => values[code].trim() !== '' && values[code].trim() !== defaults[code].trim();
  const savedCustom = LANGS.filter((l) => override && override[l.column]).map((l) => l.code);
  const notModified = LANGS.filter((l) => !savedCustom.includes(l.code)).map((l) => l.code.toUpperCase());

  function save(e) {
    e.preventDefault();
    setSaving(true);
    setStatus(null);
    // Langue identique au texte par défaut (ou vide) → null : pas de surcharge.
    const body = Object.fromEntries(LANGS.map((l) => [l.column, isCustom(l.code) ? values[l.code] : null]));
    apiPut(`/api/admin/site-content/${encodeURIComponent(field.key)}`, token, body)
      .then(() => { setStatus({ ok: true, text: t('adminHome.saved') }); onSaved(); })
      .catch((err) => setStatus({ ok: false, text: err.message }))
      .finally(() => setSaving(false));
  }

  function restore() {
    setSaving(true);
    setStatus(null);
    apiDelete(`/api/admin/site-content/${encodeURIComponent(field.key)}`, token)
      .then(() => {
        setValues(defaults);
        setStatus({ ok: true, text: t('adminHome.restored') });
        onSaved();
      })
      .catch((err) => setStatus({ ok: false, text: err.message }))
      .finally(() => setSaving(false));
  }

  return (
    <form className="content-field" onSubmit={save}>
      <h4>{t(labelKey(field.key))}</h4>
      {LANGS.map((l) => {
        const id = `cf-${field.key}-${l.code}`;
        const Input = field.multiline ? 'textarea' : 'input';
        return (
          <div key={l.code} className="field">
            <label htmlFor={id}>{t(`langNames.${l.code}`)}</label>
            <Input
              id={id} lang={l.code} dir={l.dir}
              {...(field.multiline ? { rows: 3 } : { type: 'text' })}
              maxLength={field.maxLength}
              value={values[l.code]}
              onChange={(e) => setValues((prev) => ({ ...prev, [l.code]: e.target.value }))}
            />
            <div className="content-field-meta">
              <span className={isCustom(l.code) ? 'content-badge custom' : 'content-badge'}>
                {isCustom(l.code) ? t('adminHome.badgeCustom') : t('adminHome.badgeDefault')}
              </span>
              <span aria-live="polite">{t('adminHome.counter', { count: values[l.code].length, max: field.maxLength })}</span>
            </div>
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
function ValueFieldEditor({ field, override, onSaved }) {
  const { t } = useTranslation();
  const { token } = useAuth();
  const def = SITE_CONTENT_DEFAULTS[field.key];
  const [value, setValue] = useState((override && override.value) || def);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState(null);
  const id = `cf-${field.key}`;
  const isCustom = value.trim() !== '' && value.trim() !== def;

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
      .then(() => { setValue(def); setStatus({ ok: true, text: t('adminHome.restored') }); onSaved(); })
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
function VisibilityEditor({ overrides, onSaved }) {
  const { t } = useTranslation();
  const { token } = useAuth();
  const [saving, setSaving] = useState(null);   // clé en cours d'enregistrement
  const [status, setStatus] = useState(null);
  const shown = (k) => !(overrides[`home.show.${k}`] && overrides[`home.show.${k}`].value === 'false');
  const shownCount = SHOW_KEYS.filter(shown).length;

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
        {SHOW_KEYS.map((k) => {
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

function HomeContentAdmin() {
  const { t } = useTranslation();
  const { token } = useAuth();
  const { reload: reloadSite } = useSiteContent();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  // Pas de setState synchrone dans l'effet (règle react-hooks/set-state-in-effect).
  const load = useCallback(() => {
    return apiGet('/api/admin/site-content', token)
      .then((d) => { setData(d); setError(null); })
      .catch((err) => setError(err.message));
  }, [token]);

  useEffect(() => { load(); }, [load]);

  // Après chaque enregistrement : relire les surcharges ici ET sur le site public.
  const onSaved = useCallback(() => { load(); reloadSite(); }, [load, reloadSite]);

  if (error && !data) return <p className="form-msg form-msg-error" role="alert">{error}</p>;
  if (!data) return <p>{t('common.loading')}</p>;

  const fields = Object.fromEntries(data.fields.map((f) => [f.key, f]));
  const overrides = Object.fromEntries(data.overrides.map((o) => [o.key, o]));

  return (
    <div className="content-admin">
      <p className="admin-intro">{t('adminHome.intro')}</p>

      <VisibilityEditor overrides={overrides} onSaved={onSaved} />

      {GROUPS.map((group) => (
        <section key={group.id} className="content-group" aria-labelledby={`cg-${group.id}`}>
          <h3 id={`cg-${group.id}`}>{t(`adminHome.groups.${group.id}`)}</h3>
          {group.keys.filter((k) => fields[k]).map((k) => {
            const f = fields[k];
            const o = overrides[k];
            // Clé stable : l'éditeur garde sa saisie et son message après un
            // enregistrement ; seul l'état « modifié / par défaut » est relu.
            return f.kind === 'text'
              ? <TextFieldEditor key={k} field={f} override={o} onSaved={onSaved} />
              : <ValueFieldEditor key={k} field={f} override={o} onSaved={onSaved} />;
          })}
        </section>
      ))}
    </div>
  );
}

export default HomeContentAdmin;
