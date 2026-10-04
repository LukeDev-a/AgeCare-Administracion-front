export const CONTENT_TYPES: Record<string, string> = {
  news: 'Noticias',
  joke: 'Consejos y humor',
};

export const CONTENT_STATUS_META: Record<string, { className: string; label: string }> = {
  draft: { className: 'neutral', label: 'Borrador' },
  published: { className: 'ok', label: 'Publicado' },
  archived: { className: 'serious', label: 'Archivado' },
};