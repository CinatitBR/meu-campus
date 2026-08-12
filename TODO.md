### Criar banco de dados (Cloudflare D1)

- building (represents a building)
  - id
  - name (the proper name of the building. ex: IME)
  - slug (facilitates searchs on the API and URL. ex: ime-usp)
  - lon (longitude)
  - lat (latitude)

- visual_route (represents a route. It's composed of a set of route steps)
  - id
  - building_id (the building where the route belongs to)
  - status (hidden, published)

- visual_route_step (store data about a route step)
  - id
  - visual_route_id
  - step_order
  - thumbnail_url
  - description

### Após processar as imagens, criar interface para permitir definir uma rota

- Criar tipo de dado para armazenar uma rota completa: visutal_route_step
- Permitir organizar imagens na interface em ordem
- Criar campos para preencher dados da rota
