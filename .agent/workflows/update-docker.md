---
description: How to update the application on Docker after code changes
---

To apply the latest changes (like the PDF fix) to your Docker deployment, follow these steps:

1. **Rebuild and Restart**: Run the following command in the root directory:
   ```powershell
   docker-compose up --build -d
   ```

2. **Verify Containers**: Check that all services are running:
   ```powershell
   docker-compose ps
   ```

3. **Check Logs (Optional)**: If you face any issues, check the backend logs:
   ```powershell
   docker-compose logs -f backend
   ```
