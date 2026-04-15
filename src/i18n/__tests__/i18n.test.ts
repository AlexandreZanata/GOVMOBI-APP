import enUS from '../locales/en-US.json';
import es from '../locales/es.json';
import ptBR from '../locales/pt-BR.json';
import {i18n, initI18n} from '../index';

const getObjectKeys = (value: Record<string, unknown>): string[] =>
  Object.keys(value).sort();

describe('i18n setup', () => {
  beforeAll(async () => {
    await initI18n();
  });

  it('loads all required languages', () => {
    expect(i18n.hasResourceBundle('pt-BR', 'translation')).toBe(true);
    expect(i18n.hasResourceBundle('en-US', 'translation')).toBe(true);
    expect(i18n.hasResourceBundle('es', 'translation')).toBe(true);
  });

  it('contains the same namespaces and keys in all locales', () => {
    const ptNamespaces = getObjectKeys(ptBR as Record<string, unknown>);
    const enNamespaces = getObjectKeys(enUS as Record<string, unknown>);
    const esNamespaces = getObjectKeys(es as Record<string, unknown>);

    expect(enNamespaces).toEqual(ptNamespaces);
    expect(esNamespaces).toEqual(ptNamespaces);

    ptNamespaces.forEach(namespace => {
      const ptNamespace = ptBR[namespace as keyof typeof ptBR] as Record<
        string,
        unknown
      >;
      const enNamespace = enUS[namespace as keyof typeof enUS] as Record<
        string,
        unknown
      >;
      const esNamespace = es[namespace as keyof typeof es] as Record<
        string,
        unknown
      >;

      expect(getObjectKeys(enNamespace)).toEqual(getObjectKeys(ptNamespace));
      expect(getObjectKeys(esNamespace)).toEqual(getObjectKeys(ptNamespace));
    });
  });

  it('supports interpolation in greeting key', async () => {
    await i18n.changeLanguage('pt-BR');
    expect(i18n.t('home.greeting', {name: 'Ana'})).toBe('Ola, Ana');

    await i18n.changeLanguage('en-US');
    expect(i18n.t('home.greeting', {name: 'Ana'})).toBe('Hello, Ana');

    await i18n.changeLanguage('es');
    expect(i18n.t('home.greeting', {name: 'Ana'})).toBe('Hola, Ana');
  });
});
