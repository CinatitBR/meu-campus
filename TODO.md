### Remove @jsquash/webp. Reason: doesn't perform well, it crashes on android M13 phone.

- \*Use native canvas method.
- If source image file is .heic:
  - Convert to final blob jpg (using heic-to).
  - Resize using canvas.

- Create converToFinal(): converts the source image to the final image.
  - If image source image is heic/heif: convert to jpg (heic-to) and resize with canvas.
  - Otherwise: convert to webp and resize using canvas.

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
