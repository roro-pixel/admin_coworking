import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AdminLayout } from '../components/layout/AdminLayout';
import { ArrowLeft, Save, Building2, User, Users } from 'lucide-react';
import { CustomerAutocomplete } from '../components/customers/CustomerAutocomplete';
import { memberService } from '../services/member.service';
import type { CreateMemberRequest } from '../services/member.service';
import type { CustomerSummaryResponse } from '../services/customer.service';

export const CreateMember: React.FC = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Mode: 'new' ou 'existing'
  const [mode, setMode] = useState<'new' | 'existing'>('new');
  
  // Customer existant sélectionné
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerSummaryResponse | null>(null);
  
  // Type de customer pour nouveau customer
  const [customerType, setCustomerType] = useState<'PERSON' | 'COMPANY'>('PERSON');
  
  // Informations du member
  const [formData, setFormData] = useState({
    firstname: '',
    lastname: '',
    email: '',
    phone: '',
    whatsappPhone: '',
    password: '',
    generatePassword: true,
  });

  // Informations du nouveau customer (si mode new)
  const [newCustomerData, setNewCustomerData] = useState({
    companyName: '',
    billingEmail: '',
    address: {
      streetNumber: '',
      streetName: '',
      district: '',
      city: '',
      countryCode: '',
    },
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleNewCustomerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewCustomerData({
      ...newCustomerData,
      [e.target.name]: e.target.value,
    });
  };

  const handleAddressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewCustomerData({
      ...newCustomerData,
      address: { ...newCustomerData.address, [e.target.name]: e.target.value },
    });
  };

  const validateForm = (): boolean => {
    if (!formData.firstname) { setError('Le prénom est requis'); return false; }
    if (!formData.lastname) { setError('Le nom est requis'); return false; }
    if (!formData.email) { setError('L\'email est requis'); return false; }
    if (!formData.phone) { setError('Le téléphone est requis'); return false; }
    
    if (!formData.generatePassword && !formData.password) {
      setError('Le mot de passe est requis');
      return false;
    }
    
    if (mode === 'existing' && !selectedCustomer) {
      setError('Veuillez sélectionner un customer');
      return false;
    }
    
    if (mode === 'new' && customerType === 'COMPANY' && !newCustomerData.companyName) {
      setError('Le nom de l\'entreprise est requis');
      return false;
    }
    
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setIsLoading(true);

    if (!validateForm()) {
      setIsLoading(false);
      return;
    }

    const payload: CreateMemberRequest = {
      firstname: formData.firstname,
      lastname: formData.lastname,
      email: formData.email,
      phone: formData.phone,
      whatsappPhone: formData.whatsappPhone || formData.phone,
      generatePassword: formData.generatePassword,
      ...(mode === 'existing' && selectedCustomer && {
        existingCustomerId: selectedCustomer.customerId,
        customerType: mode === 'existing' && selectedCustomer ? 
       (customerType === 'COMPANY' ? 'COMPANY' : 'PERSON') : customerType,
      }),
      ...(mode === 'new' && {
        customerType,
        ...(customerType === 'COMPANY' && { companyName: newCustomerData.companyName }),
        ...(newCustomerData.billingEmail && { billingEmail: newCustomerData.billingEmail }),
        ...(newCustomerData.address.streetNumber || newCustomerData.address.city ? { address: newCustomerData.address } : {}),
      }),
      ...(!formData.generatePassword && formData.password && { password: formData.password }),
    };

    try {
      const response = await memberService.createMemberAdmin(payload);
      setSuccess(`Member créé avec succès ! ID: ${response.memberId}`);
      setTimeout(() => navigate(`/members/${response.memberId}`), 2000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erreur lors de la création');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AdminLayout>
      <div className="mb-6 flex items-center">
        <button
          onClick={() => navigate('/members')}
          className="mr-4 p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft size={20} className="text-gray-600" />
        </button>
        <h1 className="text-2xl font-bold text-gray-900">Créer un member</h1>
      </div>

      <form onSubmit={handleSubmit} className="max-w-3xl">
        {/* Choix du mode */}
        <div className="bg-white rounded-xl p-6 shadow-sm mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Rattachement customer</h2>
          <div className="flex gap-4 mb-6">
            <button
              type="button"
              onClick={() => setMode('new')}
              className={`flex-1 p-4 border-2 rounded-lg text-center transition-all ${
                mode === 'new'
                  ? 'border-primary-600 bg-primary-50 text-primary-700'
                  : 'border-gray-200 hover:border-primary-200'
              }`}
            >
              <Users size={24} className={`mx-auto mb-2 ${mode === 'new' ? 'text-primary-600' : 'text-gray-400'}`} />
              <span className="font-medium">Nouveau customer</span>
              <p className="text-xs text-gray-500 mt-1">Crée un customer + member</p>
            </button>
            <button
              type="button"
              onClick={() => setMode('existing')}
              className={`flex-1 p-4 border-2 rounded-lg text-center transition-all ${
                mode === 'existing'
                  ? 'border-primary-600 bg-primary-50 text-primary-700'
                  : 'border-gray-200 hover:border-primary-200'
              }`}
            >
              <Building2 size={24} className={`mx-auto mb-2 ${mode === 'existing' ? 'text-primary-600' : 'text-gray-400'}`} />
              <span className="font-medium">Customer existant</span>
              <p className="text-xs text-gray-500 mt-1">Rattache à un customer</p>
            </button>
          </div>

          {mode === 'existing' ? (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Rechercher un customer</label>
              <CustomerAutocomplete
                onSelect={setSelectedCustomer}
                selectedCustomer={selectedCustomer}
                placeholder="Rechercher par nom, email..."
              />
            </div>
          ) : (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Type de customer</label>
              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={() => setCustomerType('PERSON')}
                  className={`flex-1 p-3 border rounded-lg text-center transition-all ${
                    customerType === 'PERSON'
                      ? 'border-primary-600 bg-primary-50 text-primary-700'
                      : 'border-gray-200 hover:border-primary-200'
                  }`}
                >
                  <User size={20} className="mx-auto mb-1" />
                  <span className="text-sm">Personne</span>
                </button>
                <button
                  type="button"
                  onClick={() => setCustomerType('COMPANY')}
                  className={`flex-1 p-3 border rounded-lg text-center transition-all ${
                    customerType === 'COMPANY'
                      ? 'border-primary-600 bg-primary-50 text-primary-700'
                      : 'border-gray-200 hover:border-primary-200'
                  }`}
                >
                  <Building2 size={20} className="mx-auto mb-1" />
                  <span className="text-sm">Entreprise</span>
                </button>
              </div>

              {customerType === 'COMPANY' && mode === 'new' && (
                <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nom de l'entreprise *</label>
                  <input
                    type="text"
                    name="companyName"
                    value={newCustomerData.companyName}
                    onChange={handleNewCustomerChange}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500"
                  />
                  <label className="block text-sm font-medium text-gray-700 mt-3 mb-1">Email de facturation</label>
                  <input
                    type="email"
                    name="billingEmail"
                    value={newCustomerData.billingEmail}
                    onChange={handleNewCustomerChange}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              )}
            </div>
          )}
        </div>

        {/* Informations du member */}
        <div className="bg-white rounded-xl p-6 shadow-sm mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Informations du member</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Prénom *</label>
              <input
                type="text"
                name="firstname"
                value={formData.firstname}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nom *</label>
              <input
                type="text"
                name="lastname"
                value={formData.lastname}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Téléphone *</label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">WhatsApp</label>
              <input
                type="tel"
                name="whatsappPhone"
                value={formData.whatsappPhone}
                onChange={handleChange}
                placeholder="Laissez vide = téléphone"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </div>
        </div>

        {/* Accès portail */}
        <div className="bg-white rounded-xl p-6 shadow-sm mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Accès portail</h2>
          <div className="flex items-center gap-4 mb-4">
            <label className="flex items-center">
              <input
                type="radio"
                checked={formData.generatePassword}
                onChange={() => setFormData({ ...formData, generatePassword: true, password: '' })}
                className="mr-2"
              />
              <span className="text-sm">Générer un mot de passe automatiquement</span>
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                checked={!formData.generatePassword}
                onChange={() => setFormData({ ...formData, generatePassword: false })}
                className="mr-2"
              />
              <span className="text-sm">Définir un mot de passe</span>
            </label>
          </div>

          {!formData.generatePassword && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Mot de passe *</label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500"
              />
            </div>
          )}
        </div>

        {/* Adresse (si nouveau customer) */}
        {mode === 'new' && (
          <div className="bg-white rounded-xl p-6 shadow-sm mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Adresse du customer</h2>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Numéro rue</label>
                <input
                  type="text"
                  name="streetNumber"
                  value={newCustomerData.address.streetNumber}
                  onChange={handleAddressChange}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nom rue</label>
                <input
                  type="text"
                  name="streetName"
                  value={newCustomerData.address.streetName}
                  onChange={handleAddressChange}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Quartier</label>
                <input
                  type="text"
                  name="district"
                  value={newCustomerData.address.district}
                  onChange={handleAddressChange}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ville</label>
                <input
                  type="text"
                  name="city"
                  value={newCustomerData.address.city}
                  onChange={handleAddressChange}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Pays</label>
                <input
                  type="text"
                  name="countryCode"
                  value={newCustomerData.address.countryCode}
                  onChange={handleAddressChange}
                  placeholder="CMR, FRA, etc."
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500"
                />
              </div>
            </div>
          </div>
        )}

        {/* Messages */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
            {error}
          </div>
        )}
        {success && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg text-green-600 text-sm">
            {success}
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={() => navigate('/members')}
            className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
          >
            Annuler
          </button>
          <button
            type="submit"
            disabled={isLoading}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 flex items-center"
          >
            {isLoading ? (
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
            ) : (
              <Save size={16} className="mr-2" />
            )}
            {isLoading ? 'Création...' : 'Créer le member'}
          </button>
        </div>
      </form>
    </AdminLayout>
  );
};