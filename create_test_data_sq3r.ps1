# Script per creare dati di test per SQ3R
$baseUrl = "http://localhost:5000"
$session = $null

# 1. Login
Write-Host "1. Logging in..."
try {
    $loginResponse = Invoke-WebRequest -Uri "$baseUrl/api/login" -SessionVariable session -UseBasicParsing
    Write-Host "   [OK] Login successful."
} catch {
    Write-Error "   [ERR] Login failed: $_"
    exit 1
}

# 2. Get Concorsi
Write-Host "`n2. Getting Concorsi..."
try {
    $concorsi = Invoke-RestMethod -Uri "$baseUrl/api/concorsi" -WebSession $session
    $concorsoId = $null

    if ($concorsi.Count -gt 0) {
        $concorsoId = $concorsi[0].id
        Write-Host "   [OK] Found existing concorso: $concorsoId"
    } else {
        Write-Host "   [INFO] Creating new concorso..."
        $newConcorso = @{
            titoloEnte = "Test Ente SQ3R"
            tipoConcorso = "Test Tipo"
            posti = 1
            scadenzaDomanda = "2024-12-31"
            dataPresuntaEsame = "2025-01-01"
            mesiPreparazione = 6
            oreSettimanali = 10
        }
        $jsonBody = $newConcorso | ConvertTo-Json
        $createdConcorso = Invoke-RestMethod -Uri "$baseUrl/api/concorsi" -Method Post -Body $jsonBody -ContentType "application/json" -WebSession $session
        $concorsoId = $createdConcorso.id
        Write-Host "   [OK] Created new concorso: $concorsoId"
    }
} catch {
    Write-Error "   [ERR] Failed to get/create concorso: $_"
    exit 1
}

# 3. Create Materia
Write-Host "`n3. Creating Materia..."
try {
    $materiaBody = @{
        concorsoId = $concorsoId
        nomeMateria = "Diritto Amministrativo"
        colore = "#3B82F6"
        icona = "BOOK"
    }
    $jsonBody = $materiaBody | ConvertTo-Json
    $createdMateria = Invoke-RestMethod -Uri "$baseUrl/api/sq3r/materie" -Method Post -Body $jsonBody -ContentType "application/json" -WebSession $session
    $materiaId = $createdMateria.id
    Write-Host "   [OK] Materia created: $materiaId"
} catch {
    Write-Error "   [ERR] Failed to create materia: $_"
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        Write-Host "   Response: $($reader.ReadToEnd())"
    }
    exit 1
}

# 4. Create Capitolo 1
Write-Host "`n4. Creating Capitolo 1..."
try {
    $capitolo1Body = @{
        materiaId = $materiaId
        numeroCapitolo = 1
        titolo = "Principi Generali"
        pagineInizio = 1
        pagineFine = 25
    }
    $jsonBody = $capitolo1Body | ConvertTo-Json
    $createdCapitolo1 = Invoke-RestMethod -Uri "$baseUrl/api/sq3r/capitoli" -Method Post -Body $jsonBody -ContentType "application/json" -WebSession $session
    Write-Host "   [OK] Capitolo 1 created: $($createdCapitolo1.id)"
} catch {
    Write-Error "   [ERR] Failed to create Capitolo 1: $_"
    exit 1
}

# 5. Create Capitolo 2
Write-Host "`n5. Creating Capitolo 2..."
try {
    $capitolo2Body = @{
        materiaId = $materiaId
        numeroCapitolo = 2
        titolo = "Il Procedimento Amministrativo"
        pagineInizio = 26
        pagineFine = 50
    }
    $jsonBody = $capitolo2Body | ConvertTo-Json
    $createdCapitolo2 = Invoke-RestMethod -Uri "$baseUrl/api/sq3r/capitoli" -Method Post -Body $jsonBody -ContentType "application/json" -WebSession $session
    Write-Host "   [OK] Capitolo 2 created: $($createdCapitolo2.id)"
} catch {
    Write-Error "   [ERR] Failed to create Capitolo 2: $_"
    exit 1
}

Write-Host "`n[SUCCESS] Test Data Created Successfully!"
