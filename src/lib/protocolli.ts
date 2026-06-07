export type ProtocolloSlug = 'glow-up' | 'digital-identity';

export interface ProtocolloHub {
  slug: ProtocolloSlug;
  nome: string;
  tagline: string;
  descrizione: string;
  href: string;
  icon: string;
}

export const PROTOCOLLI: ProtocolloHub[] = [
  {
    slug: 'glow-up',
    nome: 'Glow-Up',
    tagline: 'Ricalibrazione biologica d\'élite',
    descrizione: 'Protocolli per il controllo ormonale, il metabolismo e il ripristino dell\'omeostasi strutturale.',
    href: '/shop/protocollo/glow-up',
    icon: '/glowup.png',
  },
  {
    slug: 'digital-identity',
    nome: 'Digital Identity',
    tagline: 'Ingegneria della mente direttiva',
    descrizione: 'Protocolli per concentrazione blindata, isolamento neuro-chimico e protezione del controllo neurale.',
    href: '/shop/protocollo/digital-identity',
    icon: '/identity.png',
  },
];

export const BUNDLE_HUB = {
  nome: 'Bundle',
  tagline: 'Pacchetti combinati a prezzo scontato',
  descrizione: 'Unisci due o più protocolli in un\'unica offerta. Accesso multiplo, un solo acquisto.',
  href: '/shop/bundle',
  icon: '/bundle.png',
};

export function getProtocollo(slug: string): ProtocolloHub | undefined {
  return PROTOCOLLI.find((p) => p.slug === slug);
}

export function isProtocolloSlug(slug: string): slug is ProtocolloSlug {
  return slug === 'glow-up' || slug === 'digital-identity';
}
