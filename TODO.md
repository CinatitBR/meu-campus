### Update conversion

- Implement function to check if browser can convert to webp.
- Check if browser can convert to webp. If not, convert to jpg.

### Update backend

- Update worker to allow jpeg files. Webp and Jpeg files allowed.

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
