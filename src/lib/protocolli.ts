export type ProtocolloSlug = 'glow-up' | 'digital-identity';

export interface ProtocolloHub {
  slug: ProtocolloSlug;
  nome: string;
  tagline: string;
  descrizione: string;
  pageSubtitle: string;
  href: string;
  icon: string;
}

export const PROTOCOLLI: ProtocolloHub[] = [
  {
    slug: 'glow-up',
    nome: 'Glow-Up',
    tagline: 'Crescita personale & miglioramento',
    descrizione:
      'Protocolli digitali per migliorare te stesso: abitudini, mindset, immagine e benessere. Consigli concreti per vedersi e sentirsi meglio.',
    pageSubtitle:
      'Guide pratiche su come crescere, prenderti cura di te e costruire la versione migliore di te stesso — passo dopo passo.',
    href: '/shop/protocollo/glow-up',
    icon: '/glowup.png',
  },
  {
    slug: 'digital-identity',
    nome: 'Digital Identity',
    tagline: 'Presenza online & social media',
    descrizione:
      'Strategie per la tua identità digitale: cosa postare, come comunicare e come farti riconoscere online con coerenza e stile.',
    pageSubtitle:
      'Dal profilo ai contenuti: consigli su social, caption e presenza online per comunicare chi sei — senza improvvisare.',
    href: '/shop/protocollo/digital-identity',
    icon: '/identity.png',
  },
];

export const BUNDLE_HUB = {
  nome: 'Bundle',
  tagline: 'Glow-Up + Digital Identity',
  descrizione:
    'Pacchetti che uniscono guide di crescita personale e presenza online. Più contenuti, un solo acquisto a prezzo scontato.',
  pageSubtitle:
    'Combina miglioramento personale e strategia social in un\'unica offerta. Tutto ciò che ti serve, insieme.',
  href: '/shop/bundle',
  icon: '/bundle.png',
};

export const SHOP_HUB_COPY = {
  title: 'Protocolli',
  metaDescription:
    'Glow-Up per la crescita personale, Digital Identity per la presenza online, Bundle per unire entrambi. Guide digitali di Personal Statement Studio.',
  eyebrow: 'Personal Statement · Vault',
  heroSubtitle:
    'Due percorsi, un obiettivo: evolverti dentro e fuori. Glow-Up per migliorare te stesso. Digital Identity per la tua presenza online. I Bundle uniscono tutto a prezzo vantaggioso.',
};

export function getProtocollo(slug: string): ProtocolloHub | undefined {
  return PROTOCOLLI.find((p) => p.slug === slug);
}

export function isProtocolloSlug(slug: string): slug is ProtocolloSlug {
  return slug === 'glow-up' || slug === 'digital-identity';
}
