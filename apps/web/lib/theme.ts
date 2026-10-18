/**
 * Light and dark follow the OS before the first paint and live after it (system §12; the manual override comes with the
 * profile). Inline in the locale layout's head. A language switch is a client navigation into a new `[locale]` root
 * layout: React remounts `<html>` and clears its attributes, and this script does not run again, so the observer puts
 * `dark` back in the same task, before the next paint (TASK-114.2).
 */
export const themeScript = `(()=>{const d=document.documentElement,m=matchMedia('(prefers-color-scheme: dark)'),s=()=>d.classList.toggle('dark',m.matches);s();m.addEventListener('change',s);new MutationObserver(s).observe(d,{attributeFilter:['class']})})()`;
