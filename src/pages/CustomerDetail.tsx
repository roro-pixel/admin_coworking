import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AdminLayout } from '../components/layout/AdminLayout';
import { 
  ArrowLeft, 
  Mail, 
  Phone, 
  MapPin, 
  Edit,
  Save,
  X,
  CheckCircle,
  XCircle,
  AlertCircle,
  UserPlus
} from 'lucide-react';
import { customerService } from '../services/customer.service';
import type { CustomerResponse } from '../services/customer.service';

export const CustomerDetail: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<CustomerResponse | null>(null);

  const { data: customer, isLoading, error } = useQuery({
    queryKey: ['customer', id],
    queryFn: () => customerService.getCustomerById(id!),
    enabled: !!id,
  });

  const updateMutation = useMutation({
    mutationFn: (data: Partial<CustomerResponse>) => 
      customerService.updateCustomer(id!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer', id] });
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      setIsEditing(false);
    },
  });

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      </AdminLayout>
    );
  }

  if (error || !customer) {
    return (
      <AdminLayout>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-600">
          Customer non trouvé
        </div>
      </AdminLayout>
    );
  }

   const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => {
    if (!prev) return prev;
    return { ...prev, [name]: value };
    });
  };

  const handleAddressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  const { name, value } = e.target;
  setFormData((prev) => {
    if (!prev) return prev;
    return {
      ...prev,
      address: {
        ...(prev.address || {}),
        [name]: value
      }
    };
  });
};
  const handleSave = () => {
    if (formData) {
      updateMutation.mutate(formData);
    }
  };

  const getStatusIcon = () => {
    switch(customer.status) {
      case 'ACTIVE': return <CheckCircle size={16} className="text-green-600" />;
      case 'INACTIVE': return <XCircle size={16} className="text-gray-600" />;
      case 'SUSPENDED': return <AlertCircle size={16} className="text-red-600" />;
      default: return null;
    }
  };

  const getDisplayName = () => {
    if (customer.type === 'PERSON') {
      return `${customer.firstname} ${customer.lastname}`;
    } else {
      return customer.companyName;
    }
  };

  return (
    <AdminLayout>
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center">
          <button
            onClick={() => navigate('/customers')}
            className="mr-4 p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft size={20} className="text-gray-600" />
          </button>
          <div>
            <div className="flex items-center space-x-3">
              <h1 className="text-2xl font-bold text-gray-900">{getDisplayName()}</h1>
              <span className={`px-2 py-1 rounded-full text-xs flex items-center ${
                customer.status === 'ACTIVE' ? 'bg-green-100 text-green-700' :
                customer.status === 'INACTIVE' ? 'bg-gray-100 text-gray-700' :
                'bg-red-100 text-red-700'
              }`}>
                {getStatusIcon()}
                <span className="ml-1">{customer.status}</span>
              </span>
            </div>
            <p className="text-gray-500 text-sm mt-1">{customer.customerId}</p>
          </div>
        </div>
        <div className="flex space-x-3">
          {isEditing ? (
            <>
              <button
                onClick={() => setIsEditing(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                <X size={16} className="inline mr-1" />
                Annuler
              </button>
              <button
                onClick={handleSave}
                disabled={updateMutation.isPending}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
              >
                <Save size={16} className="inline mr-1" />
                {updateMutation.isPending ? 'Sauvegarde...' : 'Enregistrer'}
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => navigate(`/members/create?customerId=${customer.customerId}`)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 flex items-center"
              >
                <UserPlus size={16} className="mr-1" />
                Créer un member
              </button>
              <button
                onClick={() => {
                  setFormData(customer);
                  setIsEditing(true);
                }}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
              >
                <Edit size={16} className="inline mr-1" />
                Modifier
              </button>
            </>
          )}
        </div>
      </div>

      {/* Informations générales */}
      <div className="bg-white rounded-xl p-6 shadow-sm mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Informations générales</h2>
        <div className="grid md:grid-cols-2 gap-6">
          {customer.type === 'PERSON' ? (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Prénom</label>
                {isEditing && formData ? (
                  <input
                    type="text"
                    name="firstname"
                    value={formData.firstname || ''}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500"
                  />
                ) : (
                  <p className="text-gray-900">{customer.firstname}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nom</label>
                {isEditing && formData ? (
                  <input
                    type="text"
                    name="lastname"
                    value={formData.lastname || ''}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500"
                  />
                ) : (
                  <p className="text-gray-900">{customer.lastname}</p>
                )}
              </div>
            </>
          ) : (
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Nom de l'entreprise</label>
              {isEditing && formData ? (
                <input
                  type="text"
                  name="companyName"
                  value={formData.companyName || ''}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500"
                />
              ) : (
                <p className="text-gray-900">{customer.companyName}</p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Contact */}
      <div className="bg-white rounded-xl p-6 shadow-sm mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Contact</h2>
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <Mail size={14} className="inline mr-1" /> Email principal
            </label>
            {isEditing && formData ? (
              <input
                type="email"
                name="email"
                value={formData.email || ''}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500"
              />
            ) : (
              <p className="text-gray-900">{customer.email}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <Mail size={14} className="inline mr-1" /> Email de facturation
            </label>
            {isEditing && formData ? (
              <input
                type="email"
                name="billingEmail"
                value={formData.billingEmail || ''}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500"
              />
            ) : (
              <p className="text-gray-900">{customer.billingEmail || '-'}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <Phone size={14} className="inline mr-1" /> Téléphone
            </label>
            {isEditing && formData ? (
              <input
                type="tel"
                name="phone"
                value={formData.phone || ''}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500"
              />
            ) : (
              <p className="text-gray-900">{customer.phone || '-'}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <Phone size={14} className="inline mr-1" /> WhatsApp
            </label>
            {isEditing && formData ? (
              <input
                type="tel"
                name="whatsappPhone"
                value={formData.whatsappPhone || ''}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500"
              />
            ) : (
              <p className="text-gray-900">{customer.whatsappPhone || '-'}</p>
            )}
          </div>
        </div>
      </div>

      {/* Adresse */}
      <div className="bg-white rounded-xl p-6 shadow-sm mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          <MapPin size={16} className="inline mr-1" /> Adresse
        </h2>
        <div className="grid md:grid-cols-2 gap-6">
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Rue</label>
            {isEditing && formData ? (
              <input
                type="text"
                name="streetName"
                value={formData.address?.streetName || ''}
                onChange={handleAddressChange}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500"
              />
            ) : (
              <p className="text-gray-900">{customer.address?.streetName || '-'}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Ville</label>
            {isEditing && formData ? (
              <input
                type="text"
                name="city"
                value={formData.address?.city || ''}
                onChange={handleAddressChange}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500"
              />
            ) : (
              <p className="text-gray-900">{customer.address?.city || '-'}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Pays</label>
            {isEditing && formData ? (
              <input
                type="text"
                name="countryCode"
                value={formData.address?.countryCode || ''}
                onChange={handleAddressChange}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500"
              />
            ) : (
              <p className="text-gray-900">{customer.address?.countryCode || '-'}</p>
            )}
          </div>
        </div>
      </div>

      {/* Métadonnées */}
      <div className="bg-white rounded-xl p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Métadonnées</h2>
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
            <p className="text-gray-900">
              {customer.type === 'PERSON' ? 'Personne physique' : 'Compagnie'}
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Créé le</label>
            <p className="text-gray-900">
              {new Date(customer.createdAt).toLocaleDateString('fr-FR')}
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Statut</label>
            {isEditing && formData ? (
              <select
                name="status"
                value={formData.status}
                onChange={handleChange}
                className="px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500"
              >
                <option value="ACTIVE">Actif</option>
                <option value="INACTIVE">Inactif</option>
                <option value="SUSPENDED">Suspendu</option>
              </select>
            ) : (
              <p className="text-gray-900">{customer.status}</p>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};