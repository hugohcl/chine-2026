// Keep the existing navigation handlers and accessible labels.
const paths={
 todo:'<rect x="4" y="3" width="16" height="18" rx="3"/><path d="m8 9 1.5 1.5L12 8M8 16h1m4-6h3m-3 6h3"/>',
 calendrier:'<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M7 3v4m10-4v4M3 11h18m-13 4h2m4 0h2"/>',
 hotels:'<path d="M3 21V7l9-4 9 4v14M8 21v-5h8v5M7 9h1m8 0h1M7 12h1m8 0h1"/>',
 documents:'<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M8 5V3h8v2m-4 7v4m-2-2h4"/><circle cx="12" cy="14" r="5"/>',
 urgence:'<path d="M12 3 2.5 20h19L12 3Z"/><path d="M12 9v5m0 3h.01"/>',
 finances:'<rect x="3" y="5" width="18" height="15" rx="3"/><path d="M16 11h5v5h-5a2.5 2.5 0 0 1 0-5ZM6 5V3h12"/>',
};
for(const button of document.querySelectorAll('.tabs button[data-t]')){
 const icon=document.createElement('span');icon.className='ios-tab-icon';icon.setAttribute('aria-hidden','true');
 icon.innerHTML='<svg viewBox="0 0 24 24">'+paths[button.dataset.t]+'</svg>';button.prepend(icon);
}
