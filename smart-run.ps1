param (
    [Parameter(Mandatory=$true)]
    [string]$Prompt
)

# Caminho para o script python
$GatewayScript = Join-Path $PSScriptRoot "gateway.py"

Write-Host "[Smart-Run] Iniciando execução inteligente..." -ForegroundColor Cyan

# Executar o python gateway
python $GatewayScript $Prompt

if ($LASTEXITCODE -ne 0) {
    Write-Host "[Smart-Run] Ocorreu um erro na execução do gateway." -ForegroundColor Red
}
