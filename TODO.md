### Use @jsquash/webp to encode image data to webp

1. Decode png, jpg, and heic images

- png, jpg: decoded by browser canvas
- heic: decoded by heic-to

2. Encode to webp using encode() from @jsquash/webp

---

- \*Install @jsquash/webp
- \*Update convertToWebP(): remove canvas, encode image with encode() (@jsquash/webp)

### Otimizar conversão: perguntar se é possível deixar mais rápido

### Refatorar código: separar funções em arquivos diferentes

### Create "meu-campus-backend" repository

- Stores the worker configuration.

### Update frontend route creation business logic

- Limit step size (number of visual steps) that can be uploaded.
- Create list with allowed image types: webp, jpg, png. Allow webp upload.

### Update backend for visual route creation

- Validate POST data in the api/visual-route
  - Validate in a more robust way.
  - Limit image size.
  - Limit step number.
