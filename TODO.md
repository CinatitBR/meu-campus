### Update backend for visual route creation

- Validate POST data in the api/visual-route
  - Validate in a more robust way.
- Add data to R2 and D1

### Verify that sent blob is an image by its magic numbers

- This ensures the file is an actual image, and not malicious binary.

### Após processar as imagens, criar interface para permitir definir uma rota

- Criar tipo de dado para armazenar uma rota completa: visutal_route_step
- Permitir organizar imagens na interface em ordem
- Criar campos para preencher dados da rota
