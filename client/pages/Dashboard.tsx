import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { StatsCard } from '@/components/StatsCard';
import { FermeCard } from '@/components/FermeCard';
import { LoadingError } from '@/components/LoadingError';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Users,
  BedDouble,
  Building2,
  UserPlus,
  Plus,
  TrendingUp,
  AlertTriangle,
  Filter,
  Calendar
} from 'lucide-react';
import { useFirestore } from '@/hooks/useFirestore';
import { where } from 'firebase/firestore';
import { Ferme, Worker, Room } from '@shared/types';
import { useNavigate } from 'react-router-dom';

export default function Dashboard() {
  const { user, isSuperAdmin, isAdmin } = useAuth();
  const navigate = useNavigate();

  // Filter states for super admin
  const [selectedFerme, setSelectedFerme] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Fetch data from Firebase
  const { data: fermes, loading: fermesLoading, error: fermesError, refetch: refetchFermes } = useFirestore<Ferme>('fermes');
  const { data: allWorkers, loading: workersLoading, error: workersError, refetch: refetchWorkers } = useFirestore<Worker>('workers');
  const { data: allRooms, loading: roomsLoading, error: roomsError, refetch: refetchRooms } = useFirestore<Room>('rooms');

  // Filter data based on user role and super admin filters
  const applyFilters = (items: (Worker | Room)[], hasDateEntry: boolean = false) => {
    let filtered = user?.fermeId
      ? items.filter(item => item.fermeId === user.fermeId)
      : items;

    // Apply ferme filter for super admin
    if (isSuperAdmin && selectedFerme !== 'all') {
      filtered = filtered.filter(item => item.fermeId === selectedFerme);
    }

    // Apply date filter for super admin (only for workers that have dateEntree)
    if (isSuperAdmin && hasDateEntry && dateFilter !== 'all') {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

      filtered = filtered.filter(item => {
        const worker = item as Worker;
        if (!worker.dateEntree) return false;

        const entryDate = new Date(worker.dateEntree);

        switch (dateFilter) {
          case 'today':
            return entryDate >= today;
          case 'week':
            const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
            return entryDate >= weekAgo;
          case 'month':
            const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
            return entryDate >= monthAgo;
          case 'custom':
            if (startDate && endDate) {
              const start = new Date(startDate);
              const end = new Date(endDate);
              return entryDate >= start && entryDate <= end;
            }
            return true;
          default:
            return true;
        }
      });
    }

    return filtered;
  };

  const workers = applyFilters(allWorkers, true) as Worker[];
  const rooms = applyFilters(allRooms, false) as Room[];

  // Calculate stats
  const calculateStats = () => {
    const activeWorkers = workers.filter(w => w.statut === 'actif');
    const totalOuvriers = activeWorkers.length;
    const ouvriersHommes = activeWorkers.filter(w => w.sexe === 'homme').length;
    const ouvriersFemmes = activeWorkers.filter(w => w.sexe === 'femme').length;
    const totalChambres = rooms.length;
    const chambresOccupees = rooms.filter(r => r.occupantsActuels > 0).length;
    const placesRestantes = rooms.reduce((total, room) =>
      total + (room.capaciteTotale - room.occupantsActuels), 0);

    // Calculate average ages
    const menWorkers = activeWorkers.filter(w => w.sexe === 'homme');
    const womenWorkers = activeWorkers.filter(w => w.sexe === 'femme');

    const averageAgeMen = menWorkers.length > 0
      ? Math.round(menWorkers.reduce((sum, w) => sum + w.age, 0) / menWorkers.length)
      : 0;

    const averageAgeWomen = womenWorkers.length > 0
      ? Math.round(womenWorkers.reduce((sum, w) => sum + w.age, 0) / womenWorkers.length)
      : 0;

    return {
      totalOuvriers,
      totalChambres,
      chambresOccupees,
      placesRestantes,
      ouvriersHommes,
      ouvriersFemmes,
      averageAgeMen,
      averageAgeWomen
    };
  };

  const stats = calculateStats();

  const handleManageFerme = (fermeId: string) => {
    // In a real app, this would navigate to a detailed ferme management page
    console.log('Managing ferme:', fermeId);
  };

  const handleNouvelleFerme = () => {
    navigate('/fermes');
  };

  const getRecentWorkers = () => {
    return workers
      .sort((a, b) => new Date(b.dateEntree).getTime() - new Date(a.dateEntree).getTime())
      .slice(0, 5);
  };

  const hasAnyError = fermesError || workersError || roomsError;
  const isLoading = fermesLoading || workersLoading || roomsLoading;

  const handleRetryAll = () => {
    refetchFermes();
    refetchWorkers();
    refetchRooms();
  };

  if (hasAnyError && isLoading) {
    return (
      <LoadingError
        loading={isLoading}
        error={fermesError || workersError || roomsError}
        onRetry={handleRetryAll}
      />
    );
  }

  if (isSuperAdmin) {
    return (
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Tableau de bord</h1>
            <p className="text-gray-600 mt-2 text-sm sm:text-base">Vue d'ensemble de toutes les fermes</p>
          </div>
          <Button
            onClick={handleNouvelleFerme}
            className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 w-full sm:w-auto"
          >
            <Plus className="mr-2 h-4 w-4" />
            Nouvelle ferme
          </Button>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Filter className="mr-2 h-5 w-5" />
              Filtres
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Ferme Filter */}
              <div className="space-y-2">
                <Label htmlFor="ferme-filter">Ferme</Label>
                <Select value={selectedFerme} onValueChange={setSelectedFerme}>
                  <SelectTrigger id="ferme-filter">
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
              </div>

              {/* Date Filter */}
              <div className="space-y-2">
                <Label htmlFor="date-filter">Période</Label>
                <Select value={dateFilter} onValueChange={setDateFilter}>
                  <SelectTrigger id="date-filter">
                    <SelectValue placeholder="Toutes les dates" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Toutes les dates</SelectItem>
                    <SelectItem value="today">Aujourd'hui</SelectItem>
                    <SelectItem value="week">Cette semaine</SelectItem>
                    <SelectItem value="month">Ce mois</SelectItem>
                    <SelectItem value="custom">Période personnalisée</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Custom Date Range */}
              {dateFilter === 'custom' && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="start-date">Date début</Label>
                    <Input
                      id="start-date"
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="end-date">Date fin</Label>
                    <Input
                      id="end-date"
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                    />
                  </div>
                </>
              )}

              {/* Clear Filters Button */}
              <div className="flex items-end">
                <Button
                  variant="outline"
                  onClick={() => {
                    setSelectedFerme('all');
                    setDateFilter('all');
                    setStartDate('');
                    setEndDate('');
                  }}
                  className="w-full"
                >
                  Effacer les filtres
                </Button>
              </div>
            </div>

            {/* Active filters display */}
            {(selectedFerme !== 'all' || dateFilter !== 'all') && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="flex items-center space-x-2 text-sm">
                  <span className="font-medium text-gray-700">Filtres actifs:</span>
                  {selectedFerme !== 'all' && (
                    <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs">
                      Ferme: {fermes.find(f => f.id === selectedFerme)?.nom || selectedFerme}
                    </span>
                  )}
                  {dateFilter !== 'all' && (
                    <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs">
                      <Calendar className="inline h-3 w-3 mr-1" />
                      {dateFilter === 'today' && 'Aujourd\'hui'}
                      {dateFilter === 'week' && 'Cette semaine'}
                      {dateFilter === 'month' && 'Ce mois'}
                      {dateFilter === 'custom' && `${startDate} - ${endDate}`}
                    </span>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Global Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatsCard
            title="Total des fermes"
            value={selectedFerme === 'all' ? fermes.length : 1}
            icon={Building2}
            description={selectedFerme === 'all' ? "Fermes actives" : "Ferme sélectionnée"}
            color="blue"
          />
          <StatsCard
            title="Total ouvriers"
            value={workers.filter(w => w.statut === 'actif').length}
            icon={Users}
            description={`Ouvriers actifs${selectedFerme !== 'all' || dateFilter !== 'all' ? ' (filtrés)' : ''}`}
            color="green"
          />
          <StatsCard
            title="Total chambres"
            value={rooms.length}
            icon={BedDouble}
            description={selectedFerme !== 'all' ? "Chambre(s) de la ferme" : "Toutes les fermes"}
            color="purple"
          />
          <StatsCard
            title="Places libres"
            value={rooms.reduce((total, room) => total + (room.capaciteTotale - room.occupantsActuels), 0)}
            icon={TrendingUp}
            description={`Disponibles${selectedFerme !== 'all' ? ' (ferme)' : ' maintenant'}`}
            color="orange"
          />
        </div>

        {/* Fermes Grid */}
        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Gestion des fermes</h2>
          <LoadingError
            loading={fermesLoading}
            error={fermesError}
            onRetry={refetchFermes}
            dataCount={fermes.length}
            emptyMessage="Aucune ferme configurée"
          >
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
              {fermes.map((ferme) => (
                <FermeCard
                  key={ferme.id}
                  ferme={ferme}
                  onManage={handleManageFerme}
                />
              ))}
            </div>
          </LoadingError>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Tableau de bord</h1>
          <p className="text-gray-600 mt-2 text-sm sm:text-base">
            {user?.fermeId ? `Ferme: ${user.fermeId}` : 'Vue d\'ensemble'}
          </p>
        </div>
        <Button className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 w-full sm:w-auto">
          <UserPlus className="mr-2 h-4 w-4" />
          Nouvel ouvrier
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <StatsCard
          title="Total ouvriers"
          value={stats.totalOuvriers}
          icon={Users}
          description="Ouvriers actifs"
          color="green"
        />
        <StatsCard
          title="Chambres occupées"
          value={stats.chambresOccupees}
          icon={BedDouble}
          description={`sur ${stats.totalChambres} chambres`}
          color="blue"
        />
        <StatsCard
          title="Places libres"
          value={stats.placesRestantes}
          icon={TrendingUp}
          description="Disponibles maintenant"
          color="orange"
        />
        <StatsCard
          title="Taux d'occupation"
          value={`${Math.round((stats.chambresOccupees / stats.totalChambres) * 100)}%`}
          icon={AlertTriangle}
          description="Occupation actuelle"
          color={stats.chambresOccupees / stats.totalChambres > 0.8 ? 'red' : 'purple'}
        />
      </div>

      {/* Gender Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
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
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-gray-600">Hommes</span>
                  <span className="text-xs text-blue-600">Âge moyen: {stats.averageAgeMen} ans</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-32 bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-500 h-2 rounded-full"
                      style={{ width: `${stats.totalOuvriers > 0 ? (stats.ouvriersHommes / stats.totalOuvriers) * 100 : 0}%` }}
                    />
                  </div>
                  <span className="text-sm font-semibold text-gray-900 min-w-[2rem]">
                    {stats.ouvriersHommes}
                  </span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-gray-600">Femmes</span>
                  <span className="text-xs text-pink-600">Âge moyen: {stats.averageAgeWomen} ans</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-32 bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-pink-500 h-2 rounded-full"
                      style={{ width: `${stats.totalOuvriers > 0 ? (stats.ouvriersFemmes / stats.totalOuvriers) * 100 : 0}%` }}
                    />
                  </div>
                  <span className="text-sm font-semibold text-gray-900 min-w-[2rem]">
                    {stats.ouvriersFemmes}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Recent Workers */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <UserPlus className="mr-2 h-5 w-5" />
              Derniers arrivants
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {getRecentWorkers().map((worker) => (
                <div key={worker.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-900 truncate">{worker.nom}</p>
                    <p className="text-xs text-gray-500 truncate">
                      Chambre {worker.chambre} • {worker.dortoir}
                    </p>
                  </div>
                  <div className="text-right ml-4 flex-shrink-0">
                    <p className="text-xs text-gray-500">
                      {new Date(worker.dateEntree).toLocaleDateString('fr-FR')}
                    </p>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                      worker.sexe === 'homme'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-pink-100 text-pink-800'
                    }`}>
                      {worker.sexe}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
