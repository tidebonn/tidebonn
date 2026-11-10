# Tidebønn: endringer

Nyeste øverst, én linje per ferdige jobb, skrevet i samme commit som jobben. Format og hva som løftes til Løys-loggen: `Løys felles/regler/endringslogg.md`.

## 2026-11-10
- **Bønne-editoren ødela struktur ved lagring** · økt: Løys - Areopagos Tidebønn · 973a797 · `injectTitleH1` pakket seed-HTML (med `data-*`) inn i en ny artikkel, og editoren gjorde nestede artikler til én tekstblokk; dag 17 sekst ble flatet ut 10. nov og dag 5 vesper nestet 12. okt. Begge gjenopprettet fra seed-filene i `python-ekstraktor/bønner/`. Parseren går nå inn i omslag, tittel dedupliseres, urørt innhold lagres ikke stille, og lagring som krymper teksten >40 % stoppes. ↑ Løys: nei
