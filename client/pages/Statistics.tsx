import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useFirestore } from '@/hooks/useFirestore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { StatsCard } from '@/components/StatsCard';
import { 
  BarChart3, 
  Users, 
  BedDouble, 
  Building2,
  TrendingUp,
  TrendingDown,
  Calendar,
  Download,
  Filter
} from 'lucide-react';
import { Ferme, Worker, Room } from '@shared/types';

export default function Statistics() {
  const { user, isSuperAdmin } = useAuth();
  const { data: fermes } = useFirestore<Ferme>('fermes');
  const { data: allWorkers } = useFirestore<Worker>('workers');
  const { data: allRooms } = useFirestore<Room>('rooms');
  
  const [selectedFerme, setSelectedFerme] = useState('all');
  const [timeRange, setTimeRange] = useState('month');

  // Filter data based on user role and selected ferme
  const workers = selectedFerme === 'all' 
    ? (isSuperAdmin ? allWorkers : allWorkers.filter(w => w.fermeId === user?.fermeId))
    : allWorkers.filter(w => w.fermeId === selectedFerme);
  
  const rooms = selectedFerme === 'all'
    ? (isSuperAdmin ? allRooms : allRooms.filter(r => r.fermeId === user?.fermeId))
    : allRooms.filter(r => r.fermeId === selectedFerme);

  // Calculate comprehensive statistics
  const getStatistics = () => {
    const activeWorkers = workers.filter(w => w.statut === 'actif');
    const maleWorkers = activeWorkers.filter(w => w.sexe === 'homme');
    const femaleWorkers = activeWorkers.filter(w => w.sexe === 'femme');
    
    const occupiedRooms = rooms.filter(r => r.occupantsActuels > 0);
    const totalCapacity = rooms.reduce((sum, room) => sum + room.capaciteTotale, 0);
    const occupiedPlaces = rooms.reduce((sum, room) => sum + room.occupantsActuels, 0);
    const availablePlaces = totalCapacity - occupiedPlaces;
    
    const occupancyRate = totalCapacity > 0 ? (occupiedPlaces / totalCapacity) * 100 : 0;
    
    return {
      totalWorkers: activeWorkers.length,
      maleWorkers: maleWorkers.length,
      femaleWorkers: femaleWorkers.length,
      totalRooms: rooms.length,
      occupiedRooms: occupiedRooms.length,
      availableRooms: rooms.length - occupiedRooms.length,
      totalCapacity,
      occupiedPlaces,
      availablePlaces,
      occupancyRate: Math.round(occupancyRate),
      averageAge: activeWorkers.length > 0 ? 
        Math.round(activeWorkers.reduce((sum, w) => sum + w.age, 0) / activeWorkers.length) : 0
    };
  };

  const stats = getStatistics();

  // Get recent arrivals (last 30 days)
  const getRecentArrivals = () => {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    return workers.filter(w => 
      new Date(w.dateEntree) >= thirtyDaysAgo && w.statut === 'actif'
    ).length;
  };

  // Get age distribution
  const getAgeDistribution = () => {
    const activeWorkers = workers.filter(w => w.statut === 'actif');
    const ageGroups = {
      '18-25': 0,
      '26-35': 0,
      '36-45': 0,
      '46+': 0
    };

    activeWorkers.forEach(worker => {
      if (worker.age >= 18 && worker.age <= 25) ageGroups['18-25']++;
      else if (worker.age >= 26 && worker.age <= 35) ageGroups['26-35']++;
      else if (worker.age >= 36 && worker.age <= 45) ageGroups['36-45']++;
      else if (worker.age >= 46) ageGroups['46+']++;
    });

    return ageGroups;
  };

  // Get ferme-wise statistics for superadmin
  const getFermeStatistics = () => {
    if (!isSuperAdmin) return [];
    
    return fermes.map(ferme => {
      const fermeWorkers = allWorkers.filter(w => w.fermeId === ferme.id && w.statut === 'actif');
      const fermeRooms = allRooms.filter(r => r.fermeId === ferme.id);
      const occupiedRooms = fermeRooms.filter(r => r.occupantsActuels > 0);
      const totalCapacity = fermeRooms.reduce((sum, room) => sum + room.capaciteTotale, 0);
      const occupiedPlaces = fermeRooms.reduce((sum, room) => sum + room.occupantsActuels, 0);
      
      return {
        ferme,
        workers: fermeWorkers.length,
        rooms: fermeRooms.length,
        occupiedRooms: occupiedRooms.length,
        occupancyRate: totalCapacity > 0 ? Math.round((occupiedPlaces / totalCapacity) * 100) : 0
      };
    });
  };

  const recentArrivals = getRecentArrivals();
  const ageDistribution = getAgeDistribution();
  const fermeStats = getFermeStatistics();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center">
            <BarChart3 className="mr-3 h-8 w-8" />
            Statistiques
          </h1>
          <p className="text-gray-600 mt-2">
            Analyse détaillée des données du système
          </p>
        </div>
        <div className="flex space-x-3">
          <Button variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Exporter
          </Button>
          <Button variant="outline">
            <Filter className="mr-2 h-4 w-4" />
            Filtres
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            {isSuperAdmin && (
              <Select value={selectedFerme} onValueChange={setSelectedFerme}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Toutes les fermes" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toutes les fermes</SelectItem>
                  {fermes.map(ferme => (
                    <SelectItem key={ferme.id} value={ferme.id}>
                      {ferme.nom}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="week">7 jours</SelectItem>
                <SelectItem value="month">30 jours</SelectItem>
                <SelectItem value="quarter">3 mois</SelectItem>
                <SelectItem value="year">1 an</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Main Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCard
          title="Total ouvriers"
          value={stats.totalWorkers}
          icon={Users}
          description="Ouvriers actifs"
          trend={{ value: 8, isPositive: true }}
          color="green"
        />
        <StatsCard
          title="Taux d'occupation"
          value={`${stats.occupancyRate}%`}
          icon={TrendingUp}
          description={`${stats.occupiedPlaces}/${stats.totalCapacity} places`}
          trend={{ value: 12, isPositive: true }}
          color="blue"
        />
        <StatsCard
          title="Chambres occupées"
          value={stats.occupiedRooms}
          icon={BedDouble}
          description={`sur ${stats.totalRooms} chambres`}
          color="purple"
        />
        <StatsCard
          title="Nouveaux arrivants"
          value={recentArrivals}
          icon={Calendar}
          description="30 derniers jours"
          trend={{ value: 15, isPositive: true }}
          color="orange"
        />
      </div>

      {/* Detailed Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gender Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Users className="mr-2 h-5 w-5" />
              Répartition par genre
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-600">Hommes</span>
                <div className="flex items-center space-x-2">
                  <div className="w-32 bg-gray-200 rounded-full h-3">
                    <div 
                      className="bg-blue-500 h-3 rounded-full transition-all duration-300" 
                      style={{ width: `${stats.totalWorkers > 0 ? (stats.maleWorkers / stats.totalWorkers) * 100 : 0}%` }}
                    />
                  </div>
                  <span className="text-sm font-semibold text-gray-900 min-w-[3rem]">
                    {stats.maleWorkers} ({stats.totalWorkers > 0 ? Math.round((stats.maleWorkers / stats.totalWorkers) * 100) : 0}%)
                  </span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-600">Femmes</span>
                <div className="flex items-center space-x-2">
                  <div className="w-32 bg-gray-200 rounded-full h-3">
                    <div 
                      className="bg-pink-500 h-3 rounded-full transition-all duration-300" 
                      style={{ width: `${stats.totalWorkers > 0 ? (stats.femaleWorkers / stats.totalWorkers) * 100 : 0}%` }}
                    />
                  </div>
                  <span className="text-sm font-semibold text-gray-900 min-w-[3rem]">
                    {stats.femaleWorkers} ({stats.totalWorkers > 0 ? Math.round((stats.femaleWorkers / stats.totalWorkers) * 100) : 0}%)
                  </span>
                </div>
              </div>
              <div className="pt-4 border-t border-gray-100">
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Âge moyen</span>
                  <span className="font-semibold">{stats.averageAge} ans</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Age Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <BarChart3 className="mr-2 h-5 w-5" />
              Répartition par âge
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(ageDistribution).map(([range, count]) => (
                <div key={range} className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-600">{range} ans</span>
                  <div className="flex items-center space-x-2">
                    <div className="w-24 bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-indigo-500 h-2 rounded-full transition-all duration-300" 
                        style={{ 
                          width: `${stats.totalWorkers > 0 ? (count / stats.totalWorkers) * 100 : 0}%` 
                        }}
                      />
                    </div>
                    <span className="text-sm font-semibold text-gray-900 min-w-[2rem]">
                      {count}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Ferme Statistics (Superadmin only) */}
      {isSuperAdmin && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Building2 className="mr-2 h-5 w-5" />
              Statistiques par ferme
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {fermeStats.map((stat) => (
                <div key={stat.ferme.id} className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h4 className="font-semibold text-gray-900">{stat.ferme.nom}</h4>
                    </div>
                    <Badge variant={stat.occupancyRate > 80 ? "destructive" : stat.occupancyRate > 60 ? "default" : "secondary"}>
                      {stat.occupancyRate}% occupé
                    </Badge>
                  </div>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div className="text-center">
                      <p className="font-semibold text-gray-900">{stat.workers}</p>
                      <p className="text-gray-500">Ouvriers</p>
                    </div>
                    <div className="text-center">
                      <p className="font-semibold text-gray-900">{stat.rooms}</p>
                      <p className="text-gray-500">Chambres</p>
                    </div>
                    <div className="text-center">
                      <p className="font-semibold text-gray-900">{stat.occupiedRooms}</p>
                      <p className="text-gray-500">Occupées</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Key Insights */}
      <Card>
        <CardHeader>
          <CardTitle>Insights clés</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="p-4 bg-blue-50 rounded-lg">
              <div className="flex items-center mb-2">
                <TrendingUp className="h-5 w-5 text-blue-600 mr-2" />
                <span className="font-medium text-blue-900">Croissance</span>
              </div>
              <p className="text-sm text-blue-800">
                {recentArrivals} nouveaux ouvriers ce mois, soit une croissance de 8%
              </p>
            </div>
            <div className="p-4 bg-green-50 rounded-lg">
              <div className="flex items-center mb-2">
                <BedDouble className="h-5 w-5 text-green-600 mr-2" />
                <span className="font-medium text-green-900">Optimisation</span>
              </div>
              <p className="text-sm text-green-800">
                {stats.availablePlaces} places encore disponibles pour optimiser l'occupation
              </p>
            </div>
            <div className="p-4 bg-purple-50 rounded-lg">
              <div className="flex items-center mb-2">
                <Users className="h-5 w-5 text-purple-600 mr-2" />
                <span className="font-medium text-purple-900">Équilibre</span>
              </div>
              <p className="text-sm text-purple-800">
                Répartition équilibrée : {Math.round((stats.maleWorkers / stats.totalWorkers) * 100)}% hommes, {Math.round((stats.femaleWorkers / stats.totalWorkers) * 100)}% femmes
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
