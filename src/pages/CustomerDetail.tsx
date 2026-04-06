import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
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
  AlertCircle
} from 'lucide-react';

interface Address {
  street?: string;
  city?: string;
  postalCode?: string;
  country?: string;
}

interface BaseCustomer {
  id: string;
  customerId: string;
  type: 'INDIVIDUAL' | 'COMPANY';
  email: string;
  billingEmail?: string;
  phone?: string;
  whatsappPhone?: string;
  address?: Address;
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
  createdAt: string;
}

interface IndividualCustomer extends BaseCustomer {
  type: 'INDIVIDUAL';
  firstname: string;
  lastname: string;
}

interface CompanyCustomer extends BaseCustomer {
  type: 'COMPANY';
  companyName: string;
}

type Customer = IndividualCustomer | CompanyCustomer;

// Type guard pour vérifier si c'est une personne physique
const isIndividualCustomer = (customer: Customer): customer is IndividualCustomer => {
  return customer.type === 'INDIVIDUAL';
};

// Type guard pour vérifier si c'est une compagnie
const isCompanyCustomer = (customer: Customer): customer is CompanyCustomer => {
  return customer.type === 'COMPANY';
};

const mockIndividualCustomer: IndividualCustomer = {
  id: '1',
  customerId: 'CUST-001',
  type: 'INDIVIDUAL',
  firstname: 'Jean',
  lastname: 'Malala',
  email: 'jean@email.com',
  billingEmail: 'factures@jean.com',
  phone: '+242 06 124 36 75',
  whatsappPhone: '+242 06 124 36 75',
  address: {
    street: '123 Rue Bilélé',
    city: 'Brazzaville',
    postalCode: '75001',
    country: 'Congo'
  },
  status: 'ACTIVE',
  createdAt: '2026-01-15T10:00:00Z'
};

const mockCompanyCustomer: CompanyCustomer = {
  id: '2',
  customerId: 'CUST-002',
  type: 'COMPANY',
  companyName: 'Tech Solutions SARL',
  email: 'contact@tech.com',
  billingEmail: 'facturation@tech.com',
  phone: '+242 05 555 55 55',
  whatsappPhone: '+242 05 555 55 55',
  address: {
    street: '45 Avenue Union Africaine',
    city: 'Brazzaville',
    postalCode: '75002',
    country: 'Congo'
  },
  status: 'ACTIVE',
  createdAt: '2026-01-20T10:00:00Z'
};

export const CustomerDetail: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [isEditing, setIsEditing] = useState(false);
  const [customer, setCustomer] = useState<Customer>(
    id === '2' ? mockCompanyCustomer : mockIndividualCustomer
  );
  const [formData, setFormData] = useState<Customer>(customer);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleAddressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      address: { ...(formData.address || {}), [e.target.name]: e.target.value }
    });
  };

  const handleSave = () => {
    setCustomer(formData);
    setIsEditing(false);
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
    if (isIndividualCustomer(customer)) {
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
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
              >
                <Save size={16} className="inline mr-1" />
                Enregistrer
              </button>
            </>
          ) : (
            <button
              onClick={() => setIsEditing(true)}
              className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
            >
              <Edit size={16} className="inline mr-1" />
              Modifier
            </button>
          )}
        </div>
      </div>

      {/* Informations générales */}
      <div className="bg-white rounded-xl p-6 shadow-sm mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Informations générales</h2>
        <div className="grid md:grid-cols-2 gap-6">
          {isIndividualCustomer(customer) ? (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Prénom</label>
                {isEditing ? (
                  <input
                    type="text"
                    name="firstname"
                    value={isIndividualCustomer(formData) ? formData.firstname : ''}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500"
                  />
                ) : (
                  <p className="text-gray-900">{customer.firstname}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nom</label>
                {isEditing ? (
                  <input
                    type="text"
                    name="lastname"
                    value={isIndividualCustomer(formData) ? formData.lastname : ''}
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
              {isEditing ? (
                <input
                  type="text"
                  name="companyName"
                  value={isCompanyCustomer(formData) ? formData.companyName : ''}
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
            {isEditing ? (
              <input
                type="email"
                name="email"
                value={formData.email}
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
            {isEditing ? (
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
            {isEditing ? (
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
            {isEditing ? (
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
            {isEditing ? (
              <input
                type="text"
                name="street"
                value={formData.address?.street || ''}
                onChange={handleAddressChange}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500"
              />
            ) : (
              <p className="text-gray-900">{customer.address?.street || '-'}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Ville</label>
            {isEditing ? (
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
            <label className="block text-sm font-medium text-gray-700 mb-1">Code postal</label>
            {isEditing ? (
              <input
                type="text"
                name="postalCode"
                value={formData.address?.postalCode || ''}
                onChange={handleAddressChange}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500"
              />
            ) : (
              <p className="text-gray-900">{customer.address?.postalCode || '-'}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Pays</label>
            {isEditing ? (
              <input
                type="text"
                name="country"
                value={formData.address?.country || ''}
                onChange={handleAddressChange}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500"
              />
            ) : (
              <p className="text-gray-900">{customer.address?.country || '-'}</p>
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
              {customer.type === 'INDIVIDUAL' ? 'Personne physique' : 'Compagnie'}
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
            {isEditing ? (
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