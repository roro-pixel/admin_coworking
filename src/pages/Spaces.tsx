import React, { useState } from 'react';
import { AdminLayout } from '../components/layout/AdminLayout';
import { SpaceFormModal } from '../components/spaces/spaceFormModal';
import { Plus, Edit, Trash2, Search, MapPin, Users} from 'lucide-react';

interface Space {
  id: number;
  name: string;
  description: string;
  capacity: number;
  pricePerHour: number;
  pricePerDay: number;
  pricePerMonth: number;
  location: string;
  amenities: string[];
  status: 'available' | 'maintenance' | 'booked';
  images: string[];
}

const mockSpaces: Space[] = [
  {
    id: 1,
    name: 'Bureau Privé Lumière',
    description: 'Espace calme et lumineux avec vue dégagée. Idéal pour la concentration.',
    capacity: 4,
    pricePerHour: 5000,
    pricePerDay: 35000,
    pricePerMonth: 350000,
    location: 'Étage 3',
    amenities: ['Wifi haut débit', 'Climatisation', 'Casier', 'Éclairage naturel'],
    status: 'available',
    images: ['https://images.unsplash.com/photo-1497366216548-37526070297c']
  },
  {
    id: 2,
    name: 'Salle de Réunion Innovation',
    description: 'Salle équipée pour vos réunions d\'équipe et présentations clients.',
    capacity: 8,
    pricePerHour: 8000,
    pricePerDay: 50000,
    pricePerMonth: 500000,
    location: 'Étage 1',
    amenities: ['Vidéoprojecteur', 'Tableau blanc', 'Visio-conférence'],
    status: 'available',
    images: ['https://images.unsplash.com/photo-1431540015161-0bf868a9d407']
  },
  {
    id: 3,
    name: 'Espace Collaboratif',
    description: 'Open space dynamique pour travailler en équipe et réseauter.',
    capacity: 12,
    pricePerHour: 3000,
    pricePerDay: 20000,
    pricePerMonth: 200000,
    location: 'Étage 2',
    amenities: ['Wifi', 'Café', 'Terrasse'],
    status: 'maintenance',
    images: ['https://images.unsplash.com/photo-1497366754035-f200968a6e72']
  }
];

export const AdminSpaces: React.FC = () => {
  const [search, setSearch] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingSpace, setEditingSpace] = useState<Space | null>(null);
  const [spaces, setSpaces] = useState<Space[]>(mockSpaces);

  const filteredSpaces = spaces.filter(space =>
    space.name.toLowerCase().includes(search.toLowerCase()) ||
    space.location.toLowerCase().includes(search.toLowerCase())
  );

  const getStatusBadge = (status: string) => {
    switch(status) {
      case 'available':
        return <span className="px-2 py-1 rounded-full text-xs bg-green-100 text-green-700">Disponible</span>;
      case 'maintenance':
        return <span className="px-2 py-1 rounded-full text-xs bg-orange-100 text-orange-700">Maintenance</span>;
      case 'booked':
        return <span className="px-2 py-1 rounded-full text-xs bg-red-100 text-red-700">Réservé</span>;
      default:
        return <span className="px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-700">{status}</span>;
    }
  };

  const handleAddSpace = (data: Omit<Space, 'id'>) => {
    const newSpace: Space = {
      id: Math.max(...spaces.map(s => s.id), 0) + 1,
      ...data
    };
    setSpaces([...spaces, newSpace]);
  };

  const handleUpdateSpace = (data: Omit<Space, 'id'>) => {
    if (editingSpace) {
      setSpaces(spaces.map(s => 
        s.id === editingSpace.id ? { ...s, ...data } : s
      ));
      setEditingSpace(null);
    }
  };

  const handleDeleteSpace = (id: number) => {
    if (confirm('Êtes-vous sûr de vouloir supprimer cet espace ?')) {
      setSpaces(spaces.filter(s => s.id !== id));
    }
  };

  return (
    <AdminLayout>
      <div className="mb-6 opacity-0 animate-[fadeUp_0.6s_ease-out_forwards]">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Espaces</h1>
            <p className="text-gray-600 mt-1">Gérez tous les espaces de coworking</p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="mt-4 md:mt-0 bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors flex items-center"
          >
            <Plus size={18} className="mr-2" />
            Nouvel espace
          </button>
        </div>
      </div>

      {/* Recherche */}
      <div className="bg-white rounded-xl p-4 shadow-sm mb-6 opacity-0 animate-[fadeUp_0.6s_ease-out_forwards]" style={{ animationDelay: '0.1s' }}>
        <div className="relative">
          <Search size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Rechercher un espace..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>
      </div>

      {/* Grille des espaces */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredSpaces.map((space, index) => (
          <div 
            key={space.id} 
            className="bg-white rounded-xl shadow-sm overflow-hidden hover:shadow-lg transition-all opacity-0 animate-[fadeUp_0.6s_ease-out_forwards]"
            style={{ animationDelay: `${0.2 + index * 0.1}s` }}
          >
            <div className="h-48 relative">
              <img 
                src={space.images[0]} 
                alt={space.name}
                className="w-full h-full object-cover"
              />
              <div className="absolute top-3 right-3">
                {getStatusBadge(space.status)}
              </div>
            </div>
            
            <div className="p-5">
              <div className="flex justify-between items-start mb-2">
                <h3 className="text-lg font-semibold text-gray-900">{space.name}</h3>
                <div className="flex space-x-1">
                  <button 
                    onClick={() => setEditingSpace(space)}
                    className="p-1 text-gray-400 hover:text-primary-600 transition-colors"
                  >
                    <Edit size={16} />
                  </button>
                  <button 
                    onClick={() => handleDeleteSpace(space.id)}
                    className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
              
              <p className="text-sm text-gray-500 mb-3 line-clamp-2">{space.description}</p>
              
              <div className="flex items-center text-sm text-gray-500 mb-3">
                <MapPin size={14} className="mr-1" />
                {space.location}
                <span className="mx-2">•</span>
                <Users size={14} className="mr-1" />
                {space.capacity} pers.
              </div>
              
              <div className="flex flex-wrap gap-2 mb-4">
                {space.amenities.slice(0, 3).map((amenity, i) => (
                  <span key={i} className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded-full">
                    {amenity}
                  </span>
                ))}
                {space.amenities.length > 3 && (
                  <span className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded-full">
                    +{space.amenities.length - 3}
                  </span>
                )}
              </div>
              
              <div className="grid grid-cols-3 gap-2 pt-3 border-t border-gray-100">
                <div className="text-center">
                  <p className="text-xs text-gray-500">Heure</p>
                  <p className="text-sm font-semibold text-gray-900">{space.pricePerHour.toLocaleString()} FCFA</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-gray-500">Jour</p>
                  <p className="text-sm font-semibold text-gray-900">{space.pricePerDay.toLocaleString()} FCFA</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-gray-500">Mois</p>
                  <p className="text-sm font-semibold text-gray-900">{space.pricePerMonth.toLocaleString()} FCFA</p>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredSpaces.length === 0 && (
        <div className="text-center py-12 bg-white rounded-xl">
          <MapPin size={48} className="mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500">Aucun espace trouvé</p>
        </div>
      )}

      {/* Modal d'ajout */}
      <SpaceFormModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSave={handleAddSpace}
      />

      {/* Modal de modification */}
      {editingSpace && (
        <SpaceFormModal
          isOpen={!!editingSpace}
          onClose={() => setEditingSpace(null)}
          onSave={handleUpdateSpace}
          initialData={editingSpace}
        />
      )}
    </AdminLayout>
  );
};