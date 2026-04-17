# New Section Scaffold

## Required files
- `js/features/<section>/index.js`
- `js/features/<section>/<section>-controller.js`
- `js/features/<section>/<section>-dom.js`
- `js/features/<section>/<section>-renderers.js`
- `css/features/<section>.css`

## Optional domain files
- `js/domains/<section>/<section>-actions.js`
- `js/domains/<section>/<section>-selectors.js`
- `js/domains/<section>/<section>-repository.js`

## Required ownership rules
1. The section must have one root: `.section--<section>`.
2. All section CSS must be scoped from that root.
3. The feature must not import another feature.
4. Cross-section updates happen through selectors, capabilities, or events.
5. Browser APIs must stay inside `js/services/*`.

## Registering the section
1. Add the section root in `index.html`.
2. Add the CSS link in `<head>`.
3. Export the feature from `js/features/index.js`.
4. Add the service-worker entry in `sw.js`.
5. Run `node tools/verify-architecture.mjs`.


## Reusable scaffolds
- `scaffolds/js/features/section-template.example.js`
- `scaffolds/js/features/feature-template.example.js`
- `scaffolds/js/domains/domain-template.example.js`
- `scaffolds/css/section-template.example.css`
- `scaffolds/js/shared/define-section-contract.example.js`
