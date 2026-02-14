import { useEffect } from "react";

function ensureLink(id: string, href: string) {
  let link = document.getElementById(id) as HTMLLinkElement | null;
  if (!link) {
    link = document.createElement("link");
    link.id = id;
    link.rel = "stylesheet";
    document.head.appendChild(link);
  }
  link.href = href;
  return link;
}

export function usePageStyles(href: string) {
  useEffect(() => {
    const id = "page-styles";
    ensureLink(id, href);
    return () => {
      const link = document.getElementById(id);
      if (link) link.remove();
    };
  }, [href]);
}

