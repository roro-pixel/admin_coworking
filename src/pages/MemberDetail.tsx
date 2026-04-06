import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AdminLayout } from '../components/layout/AdminLayout';
import { 
  ArrowLeft, 
  User, 
  Mail, 
  Phone, 
  Edit,
  Save,
  X,
  CheckCircle,
  XCircle,
  AlertCircle,
  Lock,
  Unlock,
  Key
} from 'lucide-react';

const mockMember = {
  id: '1',
  memberId: 'MEM-001',
  customerId: 'CUST-001',
  firstname: 'Jean',
  lastname: 'Malala',
  fullname: 'Jean Malala',
  email: 'jean@email.com',
  phone: '+242 06 124 36 75',
  whatsappPhone: '+242 06 124 36 75',
  status: 'ACTIVE',
  portalAccess: true,
  createdAt: '2026-01-15T10:00:00Z',
  updatedAt: '2026-02-20T14:30:00Z'
};

export const MemberDetail: React.FC = () => {
  // const { id } = useParams();
  const navigate = useNavigate();
  const [isEditing, setIsEditing] = useState(false);
  const [member, setMember] = useState(mockMember);
  const [formData, setFormData] = useState(member);
  const [showResetPassword, setShowResetPassword] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSave = () => {
    setMember(formData);
    setIsEditing(false);
  };

  const handleResetPassword = () => {
    // Appel API pour réinitialiser le mot de passe
    alert('Un email de réinitialisation a été envoyé');
    setShowResetPassword(false);
  };

  const getStatusIcon = () => {
    switch(member.status) {
      case 'ACTIVE': return <CheckCircle size={16} className="text-green-600" />;
      case 'INACTIVE': return <XCircle size={16} className="text-gray-600" />;
      case 'SUSPENDED': return <AlertCircle size={16} className="text-red-600" />;
      default: return null;
    }
  };

  return (
    <AdminLayout>
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center">
          <button
            onClick={() => navigate('/members')}
            className="mr-4 p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft size={20} className="text-gray-600" />
          </button>
          <div>
            <div className="flex items-center space-x-3">
              <h1 className="text-2xl font-bold text-gray-900">{member.fullname}</h1>
              <span className={`px-2 py-1 rounded-full text-xs flex items-center ${
                member.status === 'ACTIVE' ? 'bg-green-100 text-green-700' :
                member.status === 'INACTIVE' ? 'bg-gray-100 text-gray-700' :
                'bg-red-100 text-red-700'
              }`}>
                {getStatusIcon()}
                <span className="ml-1">{member.status}</span>
              </span>
            </div>
            <p className="text-gray-500 text-sm mt-1">{member.memberId}</p>
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
            <>
              <button
                onClick={() => setShowResetPassword(true)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                <Key size={16} className="inline mr-1" />
                Réinitialiser mot de passe
              </button>
              <button
                onClick={() => setIsEditing(true)}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
              >
                <Edit size={16} className="inline mr-1" />
                Modifier
              </button>
            </>
          )}
        </div>
      </div>

      {/* Informations personnelles */}
      <div className="bg-white rounded-xl p-6 shadow-sm mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Informations personnelles</h2>
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Prénom</label>
            {isEditing ? (
              <input
                type="text"
                name="firstname"
                value={formData.firstname}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500"
              />
            ) : (
              <p className="text-gray-900">{member.firstname}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nom</label>
            {isEditing ? (
              <input
                type="text"
                name="lastname"
                value={formData.lastname}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500"
              />
            ) : (
              <p className="text-gray-900">{member.lastname}</p>
            )}
          </div>
        </div>
      </div>

      {/* Contact */}
      <div className="bg-white rounded-xl p-6 shadow-sm mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Contact</h2>
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <Mail size={14} className="inline mr-1" /> Email
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
              <p className="text-gray-900">{member.email}</p>
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
              <p className="text-gray-900">{member.phone || '-'}</p>
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
              <p className="text-gray-900">{member.whatsappPhone || '-'}</p>
            )}
          </div>
        </div>
      </div>

      {/* Accès et statut */}
      <div className="bg-white rounded-xl p-6 shadow-sm mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Accès et statut</h2>
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <User size={14} className="inline mr-1" /> Customer associé
            </label>
            <button
              onClick={() => navigate(`/customers/${member.customerId}`)}
              className="text-primary-600 hover:underline"
            >
              {member.customerId}
            </button>
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
              <p className="text-gray-900">{member.status}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Accès portail
            </label>
            {isEditing ? (
              <select
                name="portalAccess"
                value={formData.portalAccess ? 'true' : 'false'}
                onChange={(e) => setFormData({ ...formData, portalAccess: e.target.value === 'true' })}
                className="px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500"
              >
                <option value="true">Activé</option>
                <option value="false">Désactivé</option>
              </select>
            ) : (
              <div className="flex items-center">
                {member.portalAccess ? (
                  <span className="flex items-center text-green-600">
                    <Unlock size={14} className="mr-1" /> Activé
                  </span>
                ) : (
                  <span className="flex items-center text-gray-500">
                    <Lock size={14} className="mr-1" /> Désactivé
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Métadonnées */}
      <div className="bg-white rounded-xl p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Métadonnées</h2>
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Créé le</label>
            <p className="text-gray-900">
              {new Date(member.createdAt).toLocaleDateString('fr-FR')}
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Dernière modification</label>
            <p className="text-gray-900">
              {new Date(member.updatedAt).toLocaleDateString('fr-FR')}
            </p>
          </div>
        </div>
      </div>

      {/* Modal réinitialisation mot de passe */}
      {showResetPassword && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowResetPassword(false)} />
          <div className="relative bg-white rounded-2xl w-full max-w-md p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Réinitialiser le mot de passe</h3>
            <p className="text-gray-600 mb-6">
              Un email de réinitialisation sera envoyé à <strong>{member.email}</strong>.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowResetPassword(false)}
                className="flex-1 px-4 py-2 border border-gray-200 rounded-lg text-gray-700"
              >
                Annuler
              </button>
              <button
                onClick={handleResetPassword}
                className="flex-1 bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700"
              >
                Envoyer
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
};