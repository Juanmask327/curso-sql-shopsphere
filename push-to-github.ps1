# Script para subir el proyecto a GitHub por primera vez
# Ejecutar desde la carpeta raiz del proyecto: .\push-to-github.ps1

$ErrorActionPreference = "Stop"

Write-Host "Inicializando repositorio git..." -ForegroundColor Cyan
git init

Write-Host "Agregando todos los archivos..." -ForegroundColor Cyan
git add .

Write-Host "Creando commit inicial..." -ForegroundColor Cyan
git commit -m "Initial commit: ShopSphere SQL course platform"

Write-Host "Configurando rama main..." -ForegroundColor Cyan
git branch -M main

Write-Host "Conectando con GitHub..." -ForegroundColor Cyan
git remote add origin https://github.com/Juanmask327/curso-sql-shopsphere.git

Write-Host "Subiendo codigo a GitHub..." -ForegroundColor Cyan
git push -u origin main

Write-Host ""
Write-Host "Listo! Repositorio disponible en:" -ForegroundColor Green
Write-Host "https://github.com/Juanmask327/curso-sql-shopsphere" -ForegroundColor Green
