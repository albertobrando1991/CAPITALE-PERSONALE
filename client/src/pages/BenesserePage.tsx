import { useState } from 'react';
import { ArrowLeft, Wind, Droplets, Moon, MessageSquare, Utensils, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useLocation } from 'wouter';
import { useBenessere } from '@/contexts/BenessereContext';
import BoxBreathingTimer from '@/components/benessere/BoxBreathingTimer';
import HydrationTracker from '@/components/benessere/HydrationTracker';
import SleepLogger from '@/components/benessere/SleepLogger';
import ReframingCoach from '@/components/benessere/ReframingCoach';
import BenessereAchievements from '@/components/benessere/BenessereAchievements';
import NutritionTracker from '@/components/benessere/NutritionTracker';

export default function BenesserePage() {
  const [, navigate] = useLocation();
  const { stats } = useBenessere();
  const [activeTab, setActiveTab] = useState('overview');

  // Leggi tab da query string
  useState(() => {
    const params = new URLSearchParams(window.location.search);
    const tab = params.get('tab');
    if (tab) setActiveTab(tab);
  });

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            onClick={() => navigate('/dashboard')}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Dashboard
          </Button>
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              🧘 Centro Benessere Psicofisico
            </h1>
            <p className="text-muted-foreground">
              Gestisci stress, sonno, idratazione e mindset
            </p>
          </div>
        </div>
      </div>

      {/* Stats Overview */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
          <Card className="border-blue-200 bg-blue-50/50">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Idratazione</p>
                  <p className="text-2xl font-bold text-blue-600">
                    {stats.hydration.glasses_today}/{stats.hydration.target_today}
                  </p>
                </div>
                <Droplets className="h-10 w-10 text-blue-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-purple-200 bg-purple-50/50">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Breathing</p>
                  <p className="text-2xl font-bold text-purple-600">
                    {stats.breathing.sessions_today}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    sessioni oggi
                  </p>
                </div>
                <Wind className="h-10 w-10 text-purple-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-indigo-200 bg-indigo-50/50">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Sonno</p>
                  <p className="text-2xl font-bold text-indigo-600">
                    {stats.sleep.hours_last_night ? `${stats.sleep.hours_last_night}h` : '--'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    stanotte
                  </p>
                </div>
                <Moon className="h-10 w-10 text-indigo-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-orange-200 bg-orange-50/50">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Reframing</p>
                  <p className="text-2xl font-bold text-orange-600">
                    {stats.reframing.count_this_week}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    questa settimana
                  </p>
                </div>
                <MessageSquare className="h-10 w-10 text-orange-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-green-200 bg-green-50/50">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Nutrizione</p>
                  <p className="text-2xl font-bold text-green-600">
                    {stats.nutrition?.meals_today || 0}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    pasti oggi
                  </p>
                </div>
                <Utensils className="h-10 w-10 text-green-400" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="overview" className="gap-2">
            🏠 Panoramica
          </TabsTrigger>
          <TabsTrigger value="breathing" className="gap-2">
            <Wind className="h-4 w-4" />
            Breathing
          </TabsTrigger>
          <TabsTrigger value="hydration" className="gap-2">
            <Droplets className="h-4 w-4" />
            Idratazione
          </TabsTrigger>
          <TabsTrigger value="sleep" className="gap-2">
            <Moon className="h-4 w-4" />
            Sonno
          </TabsTrigger>
          <TabsTrigger value="reframing" className="gap-2">
            <MessageSquare className="h-4 w-4" />
            Reframing
          </TabsTrigger>
          <TabsTrigger value="nutrition" className="gap-2">
            <Utensils className="h-4 w-4" />
            Nutrizione
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {/* ============================================ */} 
          {/* SPECCHIETTO INFORMATIVO PERFORMANCE STUDIO */} 
          {/* ============================================ */} 
          <Card className="border-2 border-blue-300 bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 shadow-lg"> 
            <CardHeader> 
              <CardTitle className="flex items-center gap-2 text-xl"> 
                <TrendingUp className="h-6 w-6 text-blue-600" /> 
                Benessere Psicofisico = Performance di Studio 
              </CardTitle> 
              <CardDescription className="text-base"> 
                L'equazione del successo concorsuale dove la variabile psicologica pesa quanto quella tecnica 
              </CardDescription> 
            </CardHeader> 
            <CardContent> 
              <div className="space-y-6"> 
                {/* Comparazione Before/After */} 
                <div className="grid md:grid-cols-2 gap-4"> 
                  {/* SENZA Protocolli Benessere */} 
                  <div className="p-4 bg-red-50 border-2 border-red-300 rounded-lg"> 
                    <div className="flex items-center gap-2 mb-3"> 
                      <div className="p-2 bg-red-200 rounded-full"> 
                        <span className="text-2xl">❌</span> 
                      </div> 
                      <h3 className="font-bold text-red-900 text-lg">SENZA Protocolli</h3> 
                    </div> 
                    <div className="space-y-3 text-sm"> 
                      <div className="flex items-start gap-3 p-2 bg-white rounded border border-red-200"> 
                        <span className="text-red-500 font-bold text-lg">-20%</span> 
                        <div> 
                          <p className="font-semibold text-red-900">Disidratazione</p> 
                          <p className="text-xs text-red-700">Efficienza cognitiva ridotta</p> 
                        </div> 
                      </div> 
                      <div className="flex items-start gap-3 p-2 bg-white rounded border border-red-200"> 
                        <span className="text-red-500 font-bold text-lg">-30%</span> 
                        <div> 
                          <p className="font-semibold text-red-900">Sonno &lt;7h</p> 
                          <p className="text-xs text-red-700">Memoria di lavoro compromessa</p> 
                        </div> 
                      </div> 
                      <div className="flex items-start gap-3 p-2 bg-white rounded border border-red-200"> 
                        <span className="text-red-500 font-bold text-lg">-40%</span> 
                        <div> 
                          <p className="font-semibold text-red-900">Ansia non gestita</p> 
                          <p className="text-xs text-red-700">Blocco durante l'esame</p> 
                        </div> 
                      </div> 
                      <div className="flex items-start gap-3 p-2 bg-white rounded border border-red-200"> 
                        <span className="text-red-500 font-bold text-lg">-25%</span> 
                        <div> 
                          <p className="font-semibold text-red-900">Brain Fog</p> 
                          <p className="text-xs text-red-700">Zuccheri semplici pre-studio</p> 
                        </div> 
                      </div> 
                    </div> 
                    <div className="mt-4 p-4 bg-red-200 rounded-lg text-center border-2 border-red-400"> 
                      <p className="text-xs text-red-900 font-semibold mb-1">PERFORMANCE TOTALE</p> 
                      <p className="text-5xl font-bold text-red-700 mb-1">~40%</p> 
                      <p className="text-sm text-red-800 font-semibold">del tuo potenziale</p> 
                    </div> 
                  </div> 
          
                  {/* CON Protocolli Benessere */} 
                  <div className="p-4 bg-green-50 border-2 border-green-300 rounded-lg"> 
                    <div className="flex items-center gap-2 mb-3"> 
                      <div className="p-2 bg-green-200 rounded-full"> 
                        <span className="text-2xl">✅</span> 
                      </div> 
                      <h3 className="font-bold text-green-900 text-lg">CON Protocolli</h3> 
                    </div> 
                    <div className="space-y-3 text-sm"> 
                      <div className="flex items-start gap-3 p-2 bg-white rounded border border-green-200"> 
                        <span className="text-green-500 font-bold text-lg">+20%</span> 
                        <div> 
                          <p className="font-semibold text-green-900">Idratazione Ottimale</p> 
                          <p className="text-xs text-green-700">Massima lucidità mentale</p> 
                        </div> 
                      </div> 
                      <div className="flex items-start gap-3 p-2 bg-white rounded border border-green-200"> 
                        <span className="text-green-500 font-bold text-lg">+35%</span> 
                        <div> 
                          <p className="font-semibold text-green-900">Sonno 8h</p> 
                          <p className="text-xs text-green-700">Consolidamento memoria efficace</p> 
                        </div> 
                      </div> 
                      <div className="flex items-start gap-3 p-2 bg-white rounded border border-green-200"> 
                        <span className="text-green-500 font-bold text-lg">+50%</span> 
                        <div> 
                          <p className="font-semibold text-green-900">Box Breathing</p> 
                          <p className="text-xs text-green-700">Ansia trasformata in focus</p> 
                        </div> 
                      </div> 
                      <div className="flex items-start gap-3 p-2 bg-white rounded border border-green-200"> 
                        <span className="text-green-500 font-bold text-lg">+30%</span> 
                        <div> 
                          <p className="font-semibold text-green-900">Nutrizione Smart</p> 
                          <p className="text-xs text-green-700">Energia costante 4+ ore</p> 
                        </div> 
                      </div> 
                    </div> 
                    <div className="mt-4 p-4 bg-green-200 rounded-lg text-center border-2 border-green-400"> 
                      <p className="text-xs text-green-900 font-semibold mb-1">PERFORMANCE TOTALE</p> 
                      <p className="text-5xl font-bold text-green-700 mb-1">~95%</p> 
                      <p className="text-sm text-green-800 font-semibold">del tuo potenziale</p> 
                    </div> 
                  </div> 
                </div> 
          
                {/* Equazione del Successo */} 
                <div className="p-6 bg-gradient-to-r from-purple-100 via-blue-100 to-purple-100 rounded-lg border-2 border-purple-300 shadow-md"> 
                  <h3 className="font-bold text-purple-900 mb-4 text-center text-lg flex items-center justify-center gap-2"> 
                    <span className="text-2xl">📐</span> 
                    L'Equazione del Successo Concorsuale 
                  </h3> 
                  <div className="flex items-center justify-center gap-4 text-center flex-wrap"> 
                    <div className="p-4 bg-white rounded-lg shadow-md border-2 border-blue-200"> 
                      <p className="text-sm text-muted-foreground mb-1">Preparazione Tecnica</p> 
                      <p className="text-4xl font-bold text-blue-600">50%</p> 
                      <p className="text-xs text-blue-700 mt-1">📚 Studio + Pratica</p> 
                    </div> 
                    
                    <div className="text-4xl font-bold text-purple-600">+</div> 
                    
                    <div className="p-4 bg-white rounded-lg shadow-md border-2 border-purple-200"> 
                      <p className="text-sm text-muted-foreground mb-1">Benessere Psicofisico</p> 
                      <p className="text-4xl font-bold text-purple-600">50%</p> 
                      <p className="text-xs text-purple-700 mt-1">🧘 Stress + Sonno + Mindset</p> 
                    </div> 
                    
                    <div className="text-4xl font-bold text-green-600">=</div> 
                    
                    <div className="p-5 bg-gradient-to-br from-green-400 to-green-600 rounded-lg shadow-xl border-2 border-green-700"> 
                      <p className="text-sm text-white font-semibold mb-1">Performance Esame</p> 
                      <p className="text-5xl font-bold text-white">100%</p> 
                      <p className="text-xs text-green-100 mt-1">🏆 Successo Garantito</p> 
                    </div> 
                  </div> 
                  <div className="mt-4 p-3 bg-purple-50 rounded-lg border border-purple-200"> 
                    <p className="text-center text-sm text-purple-900 italic font-medium"> 
                      💡 "La conoscenza senza gestione dello stress è come un'auto potente con freni difettosi" 
                    </p> 
                  </div> 
                </div> 
          
                {/* Dati Scientifici - 3 Colonne */} 
                <div className="grid md:grid-cols-3 gap-4"> 
                  {/* Cervello Idratato */} 
                  <div className="p-4 bg-blue-50 border-2 border-blue-200 rounded-lg hover:shadow-lg transition-shadow"> 
                    <div className="flex items-center gap-2 mb-3"> 
                      <div className="p-2 bg-blue-100 rounded-full"> 
                        <Droplets className="h-5 w-5 text-blue-600" /> 
                      </div> 
                      <h4 className="font-bold text-blue-900">Cervello Idratato</h4> 
                    </div> 
                    <p className="text-3xl font-bold text-blue-600 mb-1">+20%</p> 
                    <p className="text-sm text-blue-800 mb-2"> 
                      Efficienza cognitiva quando ben idratato vs disidratato 2% 
                    </p> 
                    <div className="text-xs text-muted-foreground bg-white p-2 rounded border border-blue-200"> 
                      📚 <strong>Fonte:</strong> Journal of Nutrition (2012) 
                    </div> 
                  </div> 
          
                  {/* Sonno e Memoria */} 
                  <div className="p-4 bg-indigo-50 border-2 border-indigo-200 rounded-lg hover:shadow-lg transition-shadow"> 
                    <div className="flex items-center gap-2 mb-3"> 
                      <div className="p-2 bg-indigo-100 rounded-full"> 
                        <Moon className="h-5 w-5 text-indigo-600" /> 
                      </div> 
                      <h4 className="font-bold text-indigo-900">Sonno e Memoria</h4> 
                    </div> 
                    <p className="text-3xl font-bold text-indigo-600 mb-1">+35%</p> 
                    <p className="text-sm text-indigo-800 mb-2"> 
                      Miglioramento ritenzione informazioni con 8h sonno vs 6h 
                    </p> 
                    <div className="text-xs text-muted-foreground bg-white p-2 rounded border border-indigo-200"> 
                      📚 <strong>Fonte:</strong> Nature Neuroscience (2019) 
                    </div> 
                  </div> 
          
                  {/* Breathing e Stress */} 
                  <div className="p-4 bg-purple-50 border-2 border-purple-200 rounded-lg hover:shadow-lg transition-shadow"> 
                    <div className="flex items-center gap-2 mb-3"> 
                      <div className="p-2 bg-purple-100 rounded-full"> 
                        <Wind className="h-5 w-5 text-purple-600" /> 
                      </div> 
                      <h4 className="font-bold text-purple-900">Box Breathing</h4> 
                    </div> 
                    <p className="text-3xl font-bold text-purple-600 mb-1">-60%</p> 
                    <p className="text-sm text-purple-800 mb-2"> 
                      Riduzione cortisolo (stress) in 5 minuti di respirazione controllata 
                    </p> 
                    <div className="text-xs text-muted-foreground bg-white p-2 rounded border border-purple-200"> 
                      📚 <strong>Fonte:</strong> Frontiers in Psychology (2017) 
                    </div> 
                  </div> 
                </div> 
          
                {/* Case Study - Testimonianza */} 
                <div className="p-5 bg-gradient-to-r from-orange-50 to-yellow-50 border-2 border-orange-300 rounded-lg"> 
                  <div className="flex items-start gap-4"> 
                    <div className="flex-shrink-0 text-4xl">💬</div> 
                    <div> 
                      <h4 className="font-bold text-orange-900 mb-2 text-lg"> 
                        Case Study: Da 60/100 a 92/100 in 3 Mesi 
                      </h4> 
                      <p className="text-sm text-orange-800 italic mb-3"> 
                        "Ho seguito i protocolli benessere per 90 giorni durante la preparazione al concorso RIPAM. 
                        Prima dormivo 5-6 ore, studiavo con ansia costante e bevevo solo caffè. Dopo aver implementato 
                        Box Breathing (10 min/giorno), idratazione (8 bicchieri), sonno 8h e reframing cognitivo, 
                        il mio punteggio nei quiz è passato da 60/100 a 92/100. Non ho studiato di più, ho studiato MEGLIO." 
                      </p> 
                      <div className="flex items-center gap-3 text-xs"> 
                        <span className="px-3 py-1 bg-orange-200 rounded-full font-semibold text-orange-900"> 
                          Marco T., Vincitore Concorso RIPAM 2023 
                        </span> 
                        <span className="text-muted-foreground"> 
                          📍 Roma, Concorso 500 posti 
                        </span> 
                      </div> 
                    </div> 
                  </div> 
                </div> 
          
                {/* Call to Action Finale */} 
                <div className="p-6 bg-gradient-to-r from-green-400 to-blue-500 rounded-lg text-white text-center shadow-xl"> 
                  <h3 className="text-2xl font-bold mb-2">🎯 Inizia Oggi il Tuo Percorso</h3> 
                  <p className="text-green-50 mb-4 max-w-2xl mx-auto"> 
                    Non aspettare di sentirti sopraffatto. Il benessere psicofisico non è un optional, 
                    è la chiave per esprimere il 100% del tuo potenziale all'esame. 
                  </p> 
                  <div className="flex gap-3 justify-center flex-wrap"> 
                    <Button 
                      onClick={() => setActiveTab('breathing')} 
                      size="lg" 
                      className="bg-white text-purple-600 hover:bg-gray-100 font-bold" 
                    > 
                      <Wind className="h-5 w-5 mr-2" /> 
                      Prova Box Breathing 
                    </Button> 
                    <Button 
                      onClick={() => setActiveTab('hydration')} 
                      size="lg" 
                      className="bg-white text-blue-600 hover:bg-gray-100 font-bold" 
                    > 
                      <Droplets className="h-5 w-5 mr-2" /> 
                      Traccia Idratazione 
                    </Button> 
                    <Button 
                      onClick={() => setActiveTab('sleep')} 
                      size="lg" 
                      className="bg-white text-indigo-600 hover:bg-gray-100 font-bold" 
                    > 
                      <Moon className="h-5 w-5 mr-2" /> 
                      Registra Sonno 
                    </Button> 
                  </div> 
                </div> 
              </div> 
            </CardContent> 
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>🎯 Protocollo Pre-Esame</CardTitle>
              <CardDescription>
                Sequenza ottimale per ridurre lo stress prima della prova
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ol className="space-y-3">
                <li className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center font-bold text-purple-600">
                    1
                  </div>
                  <div>
                    <p className="font-semibold">Box Breathing (5 minuti)</p>
                    <p className="text-sm text-muted-foreground">
                      Calma il sistema nervoso autonomo
                    </p>
                    <Button
                      size="sm"
                      className="mt-2"
                      onClick={() => setActiveTab('breathing')}
                    >
                      Inizia →
                    </Button>
                  </div>
                </li>

                <li className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center font-bold text-orange-600">
                    2
                  </div>
                  <div>
                    <p className="font-semibold">Reframing Cognitivo</p>
                    <p className="text-sm text-muted-foreground">
                      Trasforma l'ansia in eccitazione produttiva
                    </p>
                    <Button
                      size="sm"
                      variant="outline"
                      className="mt-2"
                      onClick={() => setActiveTab('reframing')}
                    >
                      Inizia →
                    </Button>
                  </div>
                </li>

                <li className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center font-bold text-blue-600">
                    3
                  </div>
                  <div>
                    <p className="font-semibold">Hydration Check</p>
                    <p className="text-sm text-muted-foreground">
                      Verifica di essere ben idratato
                    </p>
                  </div>
                </li>
              </ol>
            </CardContent>
          </Card>

          {/* Guida Rapida */}
          <div className="grid md:grid-cols-2 gap-6">
            <Card className="border-l-4 border-l-purple-500">
              <CardHeader>
                <CardTitle className="text-lg">📚 Teoria: Box Breathing</CardTitle>
              </CardHeader>
              <CardContent className="text-sm space-y-2">
                <p>Tecnica usata dai Navy SEALs per il controllo dello stress.</p>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                  <li>Inspira 4 secondi</li>
                  <li>Trattieni 4 secondi (apnea piena)</li>
                  <li>Espira 4 secondi</li>
                  <li>Trattieni 4 secondi (apnea vuota)</li>
                </ul>
                <p className="text-xs text-muted-foreground mt-2">
                  Ripeti per 2-3 minuti prima di studiare o entrare in aula d'esame.
                </p>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-indigo-500">
              <CardHeader>
                <CardTitle className="text-lg">💤 Teoria: Consolidamento Sonno</CardTitle>
              </CardHeader>
              <CardContent className="text-sm space-y-2">
                <p>Durante il sonno REM e profondo il cervello consolida le informazioni.</p>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                  <li>7-9 ore raccomandate per studenti</li>
                  <li>Studiare di notte cancella il lavoro del giorno</li>
                  <li>Il sonno trasferisce info da memoria breve a lungo termine</li>
                </ul>
              </CardContent>
            </Card>
          </div>

          <BenessereAchievements />
        </TabsContent>

        {/* Breathing Tab */}
        <TabsContent value="breathing">
          <BoxBreathingTimer />
        </TabsContent>

        {/* Hydration Tab */}
        <TabsContent value="hydration">
          <HydrationTracker />
        </TabsContent>

        {/* Sleep Tab */}
        <TabsContent value="sleep">
          <SleepLogger />
        </TabsContent>

        {/* Reframing Tab */}
        <TabsContent value="reframing">
          <ReframingCoach />
        </TabsContent>

        {/* Nutrition Tab */}
        <TabsContent value="nutrition">
          <NutritionTracker />
        </TabsContent>
      </Tabs>
    </div>
  );
}