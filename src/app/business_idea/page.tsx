'use client'
import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { auth } from '../../../firebase'
import { getFirestore, collection, query, getDocs, addDoc, doc, deleteDoc, orderBy } from 'firebase/firestore'
import { Loading } from '@/components'
import { 
  FaLaptop, 
  FaShoppingCart, 
  FaCloud, 
  FaMobileAlt, 
  FaRobot, 
  FaDollarSign, 
  FaHospital, 
  FaBook, 
  FaLightbulb,
  FaCommentDots,
  FaPlus,
  FaTimes,
  FaTrash
} from 'react-icons/fa'

interface BusinessIdea {
  id: string
  title: string
  description: string
  category: string
  tags: string[]
  createdAt: Date
  updatedAt: Date
  color: string
}

const categories = [
  { value: 'tech', label: 'Technology', icon: FaLaptop, color: 'from-emerald-500 to-emerald-500' },
  { value: 'ecommerce', label: 'E-Commerce', icon: FaShoppingCart, color: 'from-emerald-500 to-emerald-500' },
  { value: 'saas', label: 'SaaS', icon: FaCloud, color: 'from-emerald-500 to-emerald-500' },
  { value: 'mobile', label: 'Mobile App', icon: FaMobileAlt, color: 'from-green-500 to-green-500' },
  { value: 'ai', label: 'AI/ML', icon: FaRobot, color: 'from-emerald-500 to-emerald-500' },
  { value: 'fintech', label: 'FinTech', icon: FaDollarSign, color: 'from-emerald-500 to-emerald-500' },
  { value: 'health', label: 'Health', icon: FaHospital, color: 'from-red-500 to-red-500' },
  { value: 'education', label: 'Education', icon: FaBook, color: 'from-emerald-500 to-emerald-500' },
  { value: 'other', label: 'Other', icon: FaLightbulb, color: 'from-stone-500 to-stone-500' }
]

const ideaColors = [
  'from-emerald-400 to-emerald-600',
  'from-emerald-400 to-emerald-600',
  'from-emerald-400 to-emerald-600',
  'from-green-400 to-green-600',
  'from-emerald-400 to-emerald-600',
  'from-emerald-400 to-emerald-600',
  'from-emerald-400 to-emerald-600',
  'from-emerald-400 to-emerald-600'
]

// Memoized category lookup map
const categoryMap = new Map(categories.map(cat => [cat.value, cat]))

// Memoized Idea Card Component
const IdeaCard = React.memo(({ 
  idea, 
  index, 
  onDelete 
}: { 
  idea: BusinessIdea
  index: number
  onDelete: (id: string) => void
}) => {
  const category = categoryMap.get(idea.category)
  const CategoryIcon = category?.icon
  
  return (
    <div
      className="group relative animate-card-entrance"
      style={{ animationDelay: `${index * 0.1}s` }}
    >
      {/* Sticky Note Card */}
      <div className={`relative h-full bg-gradient-to-br ${idea.color} p-6 rounded-2xl transform transition-all duration-300 hover:scale-105 hover:rotate-1 hover:shadow-2xl`}>
        {/* Pin */}
        <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
          <div className="w-8 h-8 bg-white rounded-full border-4 border-stone-200"></div>
        </div>

        {/* Delete Button */}
        <button
          onClick={() => onDelete(idea.id)}
          className="absolute top-4 right-4 w-8 h-8 bg-red-500/20 hover:bg-red-500/40 rounded-full flex items-center justify-center transition-all duration-200 opacity-0 group-hover:opacity-100"
          aria-label="Delete idea"
        >
          <FaTrash className="w-5 h-5 text-red-600" />
        </button>

        {/* Category Badge */}
        {category && CategoryIcon && (
          <div className="mb-3">
            <span className="inline-flex items-center gap-1 px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full text-sm font-semibold text-stone-900">
              <CategoryIcon className="w-4 h-4" />
              <span>{category.label}</span>
            </span>
          </div>
        )}

        {/* Title */}
        <h3 className="text-xl font-bold text-stone-900 mb-3 line-clamp-2">
          {idea.title}
        </h3>

        {/* Description */}
        <p className="text-stone-900/90 text-sm mb-4 line-clamp-3">
          {idea.description}
        </p>

        {/* Tags */}
        {idea.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {idea.tags.slice(0, 3).map((tag, tagIndex) => (
              <span
                key={tagIndex}
                className="px-2 py-1 bg-white/20 backdrop-blur-sm rounded-lg text-xs font-medium text-stone-900"
              >
                #{tag}
              </span>
            ))}
            {idea.tags.length > 3 && (
              <span className="px-2 py-1 bg-white/20 backdrop-blur-sm rounded-lg text-xs font-medium text-stone-900">
                +{idea.tags.length - 3}
              </span>
            )}
          </div>
        )}

        {/* Date */}
        <div className="text-xs text-stone-900/70 font-medium">
          {new Date(idea.createdAt).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
          })}
        </div>
      </div>
    </div>
  )
})

IdeaCard.displayName = 'IdeaCard'

export default function BusinessIdeaPage() {
  const [ideas, setIdeas] = useState<BusinessIdea[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'tech',
    tags: ''
  })
  const router = useRouter()

  const fetchIdeas = useCallback(async () => {
    try {
      const db = getFirestore()
      const user = auth.currentUser
      
      if (!user) return

      const q = query(
        collection(db, 'businessIdeas'),
        orderBy('createdAt', 'desc')
      )
      
      const querySnapshot = await getDocs(q)
      const fetchedIdeas = querySnapshot.docs.map(doc => {
        const data = doc.data()
        return {
          id: doc.id,
          ...data,
          tags: data.tags || [],
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
          color: data.color || ideaColors[Math.floor(Math.random() * ideaColors.length)]
        }
      }) as BusinessIdea[]
      
      setIdeas(fetchedIdeas)
      setIsLoading(false)
    } catch (error) {
      console.error('Error fetching ideas:', error)
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (!user) {
        router.push('/login')
      } else {
        fetchIdeas()
      }
    })

    return () => unsubscribe()
  }, [router, fetchIdeas])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      const db = getFirestore()
      const user = auth.currentUser
      
      if (!user) return

      const tagsArray = formData.tags
        .split(',')
        .map(tag => tag.trim())
        .filter(tag => tag.length > 0)

      const ideaData = {
        title: formData.title,
        description: formData.description,
        category: formData.category,
        tags: tagsArray,
        color: ideaColors[Math.floor(Math.random() * ideaColors.length)],
        createdAt: new Date(),
        updatedAt: new Date()
      }

      await addDoc(collection(db, 'businessIdeas'), ideaData)
      
      setFormData({
        title: '',
        description: '',
        category: 'tech',
        tags: ''
      })
      setIsModalOpen(false)
      fetchIdeas()
    } catch (error) {
      console.error('Error saving idea:', error)
      alert('Failed to save idea. Please try again.')
    }
  }

  const handleDelete = async (ideaId: string) => {
    if (!confirm('Are you sure you want to delete this idea?')) return

    try {
      const db = getFirestore()
      await deleteDoc(doc(db, 'businessIdeas', ideaId))
      fetchIdeas()
    } catch (error) {
      console.error('Error deleting idea:', error)
      alert('Failed to delete idea. Please try again.')
    }
  }

  const filteredIdeas = useMemo(() => {
    return selectedCategory === 'all' 
      ? ideas 
      : ideas.filter(idea => idea.category === selectedCategory)
  }, [ideas, selectedCategory])

  if (isLoading) {
    return <Loading />
  }

  return (
    <div className="min-h-screen bg-[#fafaf9] relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-emerald-50 rounded-full blur-3xl animate-float"></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-emerald-50 rounded-full blur-3xl animate-float-delayed"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-emerald-600/5 rounded-full blur-3xl animate-float-slow"></div>
      </div>

      <div className="max-w-7xl mx-auto px-6 lg:px-8 py-12 py-8 relative z-10">
        {/* Header */}
        <div className="text-center mb-12 animate-fade-in">
          <div className="inline-flex items-center px-4 py-2 bg-stone-100 border border-stone-200 rounded-full text-emerald-600 text-sm font-semibold mb-6">
            <div className="w-2 h-2 bg-emerald-600 rounded-full mr-2 animate-pulse"></div>
            Business Brainstorming
          </div>
          <h1 className="text-4xl lg:text-6xl font-bold text-emerald-600 mb-4 flex items-center justify-center gap-3">
            <FaLightbulb className="w-10 h-10 lg:w-12 lg:h-12 text-emerald-600" />
            <span>Idea Board</span>
            <FaLightbulb className="w-10 h-10 lg:w-12 lg:h-12 text-emerald-600" />
          </h1>
          <p className="text-xl text-stone-600 font-medium max-w-2xl mx-auto">
            Capture, organize, and develop your business ideas in one creative space
          </p>
        </div>

        {/* Category Filter */}
        <div className="mb-8 animate-fade-in-delayed">
          <div className="flex flex-wrap gap-3 justify-center">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`px-6 py-3 rounded-xl font-semibold transition-all duration-300 ${
                selectedCategory === 'all'
                  ? 'bg-emerald-600 text-white  scale-105'
                  : 'bg-stone-100 text-stone-600 border border-stone-200 hover:border-emerald-500/50 hover:text-emerald-600'
              }`}
            >
              All Ideas
            </button>
            {categories.map((cat) => {
              const IconComponent = cat.icon
              return (
                <button
                  key={cat.value}
                  onClick={() => setSelectedCategory(cat.value)}
                  className={`px-5 py-3 rounded-xl font-semibold transition-all duration-300 flex items-center gap-2 ${
                    selectedCategory === cat.value
                      ? `bg-gradient-to-r ${cat.color} text-stone-900 scale-105`
                      : 'bg-stone-100 text-stone-600 border border-stone-200 hover:border-stone-600'
                  }`}
                >
                  <IconComponent className="w-5 h-5" />
                  <span>{cat.label}</span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Add Idea Button */}
        <div className="mb-8 text-center animate-fade-in-delayed">
          <button
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center gap-3 px-8 py-4 bg-emerald-600 text-white font-bold text-lg rounded-xl  transform hover:scale-105 transition-all duration-300"
          >
            <FaPlus className="w-6 h-6" />
            Add New Idea
          </button>
        </div>

        {/* Ideas Grid */}
        {filteredIdeas.length === 0 ? (
          <div className="text-center py-20 animate-fade-in-delayed">
            <div className="inline-block p-8 bg-white/30 rounded-3xl border border-stone-200">
              <div className="flex justify-center mb-4">
                <FaCommentDots className="w-20 h-20 text-emerald-600" />
              </div>
              <h3 className="text-2xl font-bold text-stone-600 mb-2">No ideas yet</h3>
              <p className="text-stone-400 mb-6">Start brainstorming and add your first business idea!</p>
              <button
                onClick={() => setIsModalOpen(true)}
                className="px-6 py-3 bg-emerald-600 text-white font-semibold rounded-xl transition-all duration-300"
              >
                Create Your First Idea
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-fade-in-delayed">
            {filteredIdeas.map((idea, index) => (
              <IdeaCard
                key={idea.id}
                idea={idea}
                index={index}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </div>

      {/* Add Idea Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl border border-stone-200 max-w-2xl w-full max-h-[90vh] overflow-y-auto animate-slide-up">
            <div className="p-8">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-3xl font-bold text-emerald-600">
                  Add New Business Idea
                </h2>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="w-10 h-10 bg-white hover:bg-stone-100 rounded-full flex items-center justify-center transition-colors"
                >
                  <FaTimes className="w-6 h-6 text-stone-400" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label className="block text-sm font-semibold text-stone-600 mb-2">
                    Idea Title *
                  </label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    required
                    placeholder="e.g., AI-Powered Fitness App"
                    className="w-full px-4 py-3 bg-stone-100 border border-stone-200 rounded-xl text-stone-900 placeholder-stone-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-stone-600 mb-2">
                    Description *
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    required
                    rows={5}
                    placeholder="Describe your business idea in detail..."
                    className="w-full px-4 py-3 bg-stone-100 border border-stone-200 rounded-xl text-stone-900 placeholder-stone-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all resize-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-stone-600 mb-2">
                    Category *
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    required
                    className="w-full px-4 py-3 bg-stone-100 border border-stone-200 rounded-xl text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all"
                  >
                    {categories.map((cat) => (
                      <option key={cat.value} value={cat.value} className="bg-white">
                        {cat.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-stone-600 mb-2">
                    Tags (comma-separated)
                  </label>
                  <input
                    type="text"
                    value={formData.tags}
                    onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                    placeholder="e.g., AI, fitness, mobile, subscription"
                    className="w-full px-4 py-3 bg-stone-100 border border-stone-200 rounded-xl text-stone-900 placeholder-stone-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all"
                  />
                </div>

                <div className="flex gap-4 pt-4">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1 px-6 py-3 bg-white hover:bg-stone-100 text-stone-600 font-semibold rounded-xl transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-6 py-3 bg-emerald-600 text-white font-semibold rounded-xl  transform hover:scale-105 transition-all duration-300"
                  >
                    Save Idea
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
