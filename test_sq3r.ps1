# Test SQ3R API
$baseUrl = "http://localhost:5000"
$session = $null

# 1. Login (to get session cookie)
Write-Host "1. Logging in..."
try {
    $loginResponse = Invoke-WebRequest -Uri "$($baseUrl)/api/login" -SessionVariable session -UseBasicParsing
    Write-Host "   Login successful. Session cookie obtained."
} catch {
    Write-Error "   Login failed: $_"
    exit 1
}

# 2. Get Concorsi (to get a valid concorsoId)
Write-Host "`n2. Getting Concorsi..."
try {
    $concorsi = Invoke-RestMethod -Uri "$($baseUrl)/api/concorsi" -WebSession $session
    $concorsoId = $null

    if ($concorsi.Count -gt 0) {
        $concorsoId = $concorsi[0].id
        Write-Host "   Found existing concorso: $concorsoId"
    } else {
        Write-Host "   No concorsi found. Creating one..."
        $newConcorso = @{
            titoloEnte = "Test Ente"
            tipoConcorso = "Test Tipo"
            posti = 1
            scadenzaDomanda = "2024-12-31"
            dataPresuntaEsame = "2025-01-01"
            mesiPreparazione = 6
            oreSettimanali = 10
        }
        $jsonBody = $newConcorso | ConvertTo-Json
        $createdConcorso = Invoke-RestMethod -Uri "$($baseUrl)/api/concorsi" -Method Post -Body $jsonBody -ContentType "application/json" -WebSession $session
        $concorsoId = $createdConcorso.id
        Write-Host "   Created new concorso: $concorsoId"
    }
} catch {
    Write-Error "   Failed to get/create concorso: $_"
    exit 1
}

# 3. Test 1: Crea una fonte
Write-Host "`n3. Test 1: Crea una fonte..."
try {
    $fonteBody = @{
        concorsoId = $concorsoId
        tipo = "personale"
        titolo = "Dispensa Diritto Amministrativo"
        materia = "Diritto Amministrativo"
        autore = "Prof. Rossi"
    }
    $jsonBody = $fonteBody | ConvertTo-Json
    $createdFonte = Invoke-RestMethod -Uri "$($baseUrl)/api/sq3r/fonti" -Method Post -Body $jsonBody -ContentType "application/json" -WebSession $session
    $fonteId = $createdFonte.id
    Write-Host "   [OK] Fonte created: $fonteId - $($createdFonte.titolo)"
} catch {
    Write-Error "   [ERR] Failed to create fonte: $_"
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        Write-Host "   Response: $($reader.ReadToEnd())"
    }
    exit 1
}

# 4. Test 2: Lista fonti
Write-Host "`n4. Test 2: Lista fonti..."
try {
    $fonti = Invoke-RestMethod -Uri "$($baseUrl)/api/sq3r/fonti?concorsoId=$concorsoId" -Method Get -WebSession $session
    Write-Host "   [OK] Retrieved $($fonti.Count) fonti"
    $fonti | ForEach-Object { Write-Host "      - $($_.titolo) ($($_.tipo))" }
} catch {
    Write-Error "   [ERR] Failed to list fonti: $_"
    exit 1
}

# 5. Test 3: Crea una materia
Write-Host "`n5. Test 3: Crea una materia..."
try {
    $materiaBody = @{
        concorsoId = $concorsoId
        nomeMateria = "Diritto Amministrativo"
        colore = "#3B82F6"
        icona = "BOOK"
    }
    $jsonBody = $materiaBody | ConvertTo-Json
    $createdMateria = Invoke-RestMethod -Uri "$($baseUrl)/api/sq3r/materie" -Method Post -Body $jsonBody -ContentType "application/json" -WebSession $session
    $materiaId = $createdMateria.id
    Write-Host "   [OK] Materia created: $materiaId - $($createdMateria.nomeMateria)"
} catch {
    Write-Error "   [ERR] Failed to create materia: $_"
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        Write-Host "   Response: $($reader.ReadToEnd())"
    }
    exit 1
}

# 6. Test 4: Crea un capitolo
Write-Host "`n6. Test 4: Crea un capitolo..."
try {
    $capitoloBody = @{
        materiaId = $materiaId
        numeroCapitolo = 1
        titolo = "Principi Generali"
        pagineInizio = 1
        pagineFine = 25
    }
    $jsonBody = $capitoloBody | ConvertTo-Json
    $createdCapitolo = Invoke-RestMethod -Uri "$($baseUrl)/api/sq3r/capitoli" -Method Post -Body $jsonBody -ContentType "application/json" -WebSession $session
    $capitoloId = $createdCapitolo.id
    Write-Host "   [OK] Capitolo created: $capitoloId - $($createdCapitolo.titolo)"
} catch {
    Write-Error "   [ERR] Failed to create capitolo: $_"
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        Write-Host "   Response: $($reader.ReadToEnd())"
    }
    exit 1
}

# 7. Test 5: Lista capitoli
Write-Host "`n7. Test 5: Lista capitoli..."
try {
    $capitoli = Invoke-RestMethod -Uri "$($baseUrl)/api/sq3r/capitoli?materiaId=$materiaId" -Method Get -WebSession $session
    Write-Host "   [OK] Retrieved $($capitoli.Count) capitoli"
    $capitoli | ForEach-Object { Write-Host "      - Cap. $($_.numeroCapitolo): $($_.titolo)" }
} catch {
    Write-Error "   [ERR] Failed to list capitoli: $_"
    exit 1
}

Write-Host "`n[SUCCESS] ALL TESTS PASSED SUCCESSFULLY!"
