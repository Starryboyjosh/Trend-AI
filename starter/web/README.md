# HiTrendy web

Frontend Next.js/TypeScript integrado con el backend real del repositorio.

## Desarrollo

Desde la raíz del monorepo:

```bash
npm install
npm run dev -w starter/web
```

Validaciones del frontend:

```bash
npm run typecheck -w starter/web
npm run lint -w starter/web
npm run test -w starter/web
npm run build -w starter/web
```

El frontend conserva dos modos:

- **API real:** usa el proxy `/api/v1` de Next.js, configurado mediante
  `NEXT_PUBLIC_API_URL`, y la autenticación del backend.
- **Demo local:** permite recorrer el flujo sin credenciales externas y guarda
  el estado demo en el navegador.

La configuración (`/settings`) sigue siendo la implementación existente del
repositorio. Las rutas antiguas (`/assistant`, `/conversations`, `/projects`)
se mantienen como alias de compatibilidad hacia el App Shell actual.

El análisis de tendencias en tiempo real no forma parte del MVP actual. La
prioridad de esta entrega es generar, editar y guardar contenido, dejando el
contexto de tendencias para una fase posterior con fuentes autorizadas.
