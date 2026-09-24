# Builds the whole system into one image: the React frontend is compiled first, then copied into the
# API's wwwroot so a single container serves both the app and its API.

FROM node:22-alpine AS frontend
WORKDIR /src
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

FROM mcr.microsoft.com/dotnet/sdk:10.0 AS backend
WORKDIR /src
COPY backend/AssetManager.Api/ ./AssetManager.Api/
COPY --from=frontend /src/dist/ ./AssetManager.Api/wwwroot/
RUN dotnet publish AssetManager.Api/AssetManager.Api.csproj -c Release -o /app

FROM mcr.microsoft.com/dotnet/aspnet:10.0
WORKDIR /app
COPY --from=backend /app/ ./
ENV ASPNETCORE_ENVIRONMENT=Production
# Hosts that assign a port override this through PORT; 8080 is the fallback for a plain docker run.
ENV PORT=8080
EXPOSE 8080
ENTRYPOINT ["dotnet", "AssetManager.Api.dll"]
