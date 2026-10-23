import { useEffect } from "react";

const SRC =
  "https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-3862074007439007";

export default function AdSense() {
  useEffect(() => {
    if (document.querySelector("script[data-adsense]")) return;

    const script = document.createElement("script");
    script.dataset.adsense = "";
    script.async = true;
    script.crossOrigin = "anonymous";
    script.src = SRC;
    document.head.appendChild(script);
  }, []);

  return null;
}
