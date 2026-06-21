'use client';

import { useState, useEffect } from 'react';
import { Search, Heart, Plus, X, Shuffle, User } from 'lucide-react';
import { supabase } from '../lib/supabase';

type Recipe = {
  idMeal: string;
  strMeal: string;
  strMealThumb: string;
  strCategory: string;
  strArea: string;
  strInstructions?: string;
};

type FullRecipe = Recipe & {
  ingredients: string[];
  measures: string[];
};

type RatingComment = {
  id: string;
  username: string;
  rating: number;
  comment: string;
  date: string;
};

type Favorite = {
  id?: string;
  recipe_id: string;
  recipe_name: string;
  image_url: string;
};

export default function MeatholeRecipeFinder() {
  const [ingredients, setIngredients] = useState<string[]>([]);
  const [currentIngredient, setCurrentIngredient] = useState('');
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchPerformed, setSearchPerformed] = useState(false);
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [selectedRecipe, setSelectedRecipe] = useState<FullRecipe | null>(null);
  const [completedSteps, setCompletedSteps] = useState<string[]>([]);
  const [ratings, setRatings] = useState<Record<string, RatingComment[]>>({});
  const [activeTab, setActiveTab] = useState<'search' | 'favorites'>('search');

  const [newRating, setNewRating] = useState(7);
  const [newComment, setNewComment] = useState('');
  const [username, setUsername] = useState('Anonymous Chef');

  // Load Favorites from Supabase
  const loadFavorites = async () => {
    const { data } = await supabase
      .from('user_favorites')
      .select('*')
      .order('created_at', { ascending: false });
    if (data) setFavorites(data);
  };

  useEffect(() => {
    loadFavorites();
  }, []);

  const addIngredient = () => {
    if (currentIngredient.trim() && !ingredients.includes(currentIngredient.trim())) {
      setIngredients([...ingredients, currentIngredient.trim()]);
      setCurrentIngredient('');
    }
  };

  const removeIngredient = (index: number) => {
    setIngredients(ingredients.filter((_, i) => i !== index));
  };

  const searchRecipes = async () => {
    if (ingredients.length === 0) return;
    setLoading(true);
    try {
      const res = await fetch(`https://www.themealdb.com/api/json/v1/1/filter.php?i=${ingredients[0]}`);
      const data = await res.json();
      setRecipes(data.meals || []);
      setSearchPerformed(true);
      setActiveTab('search');
    } catch (error) {
      alert("No recipes found. Try different ingredients.");
    }
    setLoading(false);
  };

  const fetchFullRecipe = async (id: string) => {
    try {
      const res = await fetch(`https://www.themealdb.com/api/json/v1/1/lookup.php?i=${id}`);
      const data = await res.json();
      const meal = data.meals[0];

      const ingredientsList: string[] = [];
      const measuresList: string[] = [];

      for (let i = 1; i <= 20; i++) {
        const ing = meal[`strIngredient${i}`];
        const measure = meal[`strMeasure${i}`];
        if (ing && ing.trim()) {
          ingredientsList.push(ing);
          measuresList.push(measure || '');
        }
      }

      setSelectedRecipe({ ...meal, ingredients: ingredientsList, measures: measuresList });
      setCompletedSteps([]);
    } catch (error) {
      alert("Failed to load recipe details");
    }
  };

  const toggleFavorite = async (recipe: Recipe) => {
    const isAlreadyFavorite = favorites.some(f => f.recipe_id === recipe.idMeal);

    if (isAlreadyFavorite) {
      await supabase.from('user_favorites').delete().eq('recipe_id', recipe.idMeal);
    } else {
      await supabase.from('user_favorites').insert({
        recipe_id: recipe.idMeal,
        recipe_name: recipe.strMeal,
        image_url: recipe.strMealThumb,
      });
    }
    loadFavorites();
  };

  const toggleStep = (step: string) => {
    if (completedSteps.includes(step)) {
      setCompletedSteps(completedSteps.filter(s => s !== step));
    } else {
      setCompletedSteps([...completedSteps, step]);
    }
  };

  const submitRating = () => {
    if (!selectedRecipe || !newComment.trim()) return;

    const ratingEntry: RatingComment = {
      id: Date.now().toString(),
      username,
      rating: newRating,
      comment: newComment.trim(),
      date: new Date().toLocaleDateString(),
    };

    setRatings(prev => ({
      ...prev,
      [selectedRecipe.idMeal]: [...(prev[selectedRecipe.idMeal] || []), ratingEntry]
    }));

    setNewComment('');
  };

  const getAverageRating = (recipeId: string) => {
    const recipeRatings = ratings[recipeId] || [];
    if (recipeRatings.length === 0) return "—";
    const sum = recipeRatings.reduce((acc, r) => acc + r.rating, 0);
    return (sum / recipeRatings.length).toFixed(1);
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-orange-950 via-red-950 to-amber-950 text-white pb-12">
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="text-center py-12">
          <h1 className="text-6xl font-bold text-orange-400 mb-2">MEATHOLE</h1>
          <p className="text-2xl text-orange-200">Recipe Finder</p>
        </div>

        {/* Tabs */}
        <div className="flex justify-center mb-10">
          <div className="bg-zinc-900 rounded-3xl p-1 flex border border-orange-900">
            <button
              onClick={() => setActiveTab('search')}
              className={`px-10 py-3 rounded-3xl font-medium transition ${activeTab === 'search' ? 'bg-orange-600 text-white' : 'hover:bg-zinc-800'}`}
            >
              🔍 Search Recipes
            </button>
            <button
              onClick={() => setActiveTab('favorites')}
              className={`px-10 py-3 rounded-3xl font-medium transition flex items-center gap-2 ${activeTab === 'favorites' ? 'bg-orange-600 text-white' : 'hover:bg-zinc-800'}`}
            >
              ❤️ My Favorites ({favorites.length})
            </button>
          </div>
        </div>

        {/* SEARCH TAB */}
        {activeTab === 'search' && (
          <>
            {/* Ingredient Input */}
            <div className="max-w-2xl mx-auto mb-12">
              <div className="bg-zinc-900/70 border border-orange-900 rounded-3xl p-8">
                <h2 className="text-xl font-semibold mb-4">What ingredients do you have?</h2>

                <div className="flex gap-3 mb-6">
                  <input
                    type="text"
                    value={currentIngredient}
                    onChange={(e) => setCurrentIngredient(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && addIngredient()}
                    placeholder="e.g. chicken, rice, tomato..."
                    className="flex-1 bg-zinc-800 border border-orange-800 rounded-2xl px-6 py-4 text-lg focus:outline-none focus:border-orange-500"
                  />
                  <button onClick={addIngredient} className="bg-orange-600 hover:bg-orange-700 px-8 rounded-2xl font-medium">Add</button>
                </div>

                <div className="flex flex-wrap gap-3 mb-8 min-h-[50px]">
                  {ingredients.map((ing, index) => (
                    <div key={index} className="bg-orange-900/60 border border-orange-700 px-5 py-2 rounded-2xl flex items-center gap-2">
                      {ing}
                      <button onClick={() => removeIngredient(index)}><X size={18} /></button>
                    </div>
                  ))}
                </div>

                <div className="flex gap-4">
                  <button
                    onClick={searchRecipes}
                    disabled={ingredients.length === 0 || loading}
                    className="flex-1 bg-gradient-to-r from-orange-500 to-red-600 py-4 rounded-2xl font-semibold text-lg disabled:opacity-50"
                  >
                    Search Recipes
                  </button>
                  <button onClick={() => {}} className="bg-zinc-800 hover:bg-zinc-700 px-8 rounded-2xl">Random</button>
                </div>
              </div>
            </div>

            {/* Recipe Grid */}
            {searchPerformed && recipes.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {recipes.map(recipe => (
                  <div key={recipe.idMeal} onClick={() => fetchFullRecipe(recipe.idMeal)}
                    className="bg-zinc-900 border border-orange-900 rounded-3xl overflow-hidden cursor-pointer hover:border-orange-500 group">
                    <img src={recipe.strMealThumb} alt={recipe.strMeal} className="w-full h-56 object-cover" />
                    <div className="p-6">
                      <div className="flex justify-between items-start">
                        <h3 className="text-xl font-semibold">{recipe.strMeal}</h3>
                        <button onClick={(e) => { e.stopPropagation(); toggleFavorite(recipe); }}>
                          <Heart fill={favorites.some(f => f.recipe_id === recipe.idMeal) ? "currentColor" : "none"} className="text-orange-400" size={26} />
                        </button>
                      </div>
                      <p className="text-orange-300 mt-1">{recipe.strCategory}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* FAVORITES TAB */}
        {activeTab === 'favorites' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {favorites.length > 0 ? (
              favorites.map(fav => (
                <div key={fav.recipe_id} className="bg-zinc-900 border border-orange-900 rounded-3xl overflow-hidden">
                  <img src={fav.image_url} alt={fav.recipe_name} className="w-full h-56 object-cover" />
                  <div className="p-6">
                    <h3 className="text-xl font-semibold">{fav.recipe_name}</h3>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-center text-orange-300 text-xl py-20">No favorites yet. Start adding some!</p>
            )}
          </div>
        )}
      </div>

      {/* Recipe Detail Modal */}
      {selectedRecipe && (
        <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-orange-800 rounded-3xl max-w-4xl w-full max-h-[95vh] overflow-auto">
            {/* Modal content (same as previous version) */}
            <div className="sticky top-0 bg-zinc-900 p-6 border-b border-orange-800 flex justify-between items-center">
              <h2 className="text-3xl font-bold">{selectedRecipe.strMeal}</h2>
              <button onClick={() => setSelectedRecipe(null)} className="text-4xl text-zinc-400 hover:text-white">×</button>
            </div>

            <div className="p-8">
              <img src={selectedRecipe.strMealThumb} alt={selectedRecipe.strMeal} className="w-full rounded-2xl mb-8" />

              {/* Ingredients */}
              <h3 className="text-2xl font-semibold mb-4 text-orange-400">Ingredients</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-12">
                {selectedRecipe.ingredients.map((ing, i) => (
                  <div key={i} className="bg-zinc-800 p-4 rounded-2xl flex gap-3">
                    <span className="text-orange-400">•</span>
                    <span>{selectedRecipe.measures[i]} {ing}</span>
                  </div>
                ))}
              </div>

              {/* Instructions */}
              <h3 className="text-2xl font-semibold mb-6 text-orange-400">Instructions</h3>
              <div className="space-y-6 mb-12">
                {selectedRecipe.strInstructions?.split('. ').filter(Boolean).map((step, index) => (
                  <div key={index} onClick={() => toggleStep(step)}
                    className={`flex gap-4 p-5 rounded-2xl border transition-all cursor-pointer ${
                      completedSteps.includes(step) ? 'bg-green-900/30 border-green-700' : 'bg-zinc-800 border-zinc-700 hover:border-orange-700'
                    }`}>
                    <input type="checkbox" checked={completedSteps.includes(step)} onChange={() => toggleStep(step)} className="mt-1 accent-orange-500" />
                    <p className="leading-relaxed">{step}.</p>
                  </div>
                ))}
              </div>

              {/* Rating Section */}
              <div className="border-t border-orange-900 pt-8">
                <h3 className="text-2xl font-semibold mb-6">Rate this Recipe</h3>
                {/* Rating UI (same as previous) */}
                <div className="bg-zinc-800 p-6 rounded-3xl">
                  <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Your name" className="w-full bg-zinc-900 border border-orange-800 rounded-2xl px-5 py-3 mb-4" />
                  
                  <div className="flex items-center gap-4 mb-4">
                    <span>Rating:</span>
                    <input type="range" min="1" max="10" value={newRating} onChange={(e) => setNewRating(Number(e.target.value))} className="flex-1 accent-orange-500" />
                    <span className="font-bold text-xl w-12">{newRating}/10</span>
                  </div>

                  <textarea value={newComment} onChange={(e) => setNewComment(e.target.value)} placeholder="Share your thoughts..." className="w-full bg-zinc-900 border border-orange-800 rounded-2xl px-5 py-4 h-28" />

                  <button onClick={submitRating} className="mt-4 w-full bg-orange-600 hover:bg-orange-700 py-4 rounded-2xl font-semibold">Submit Rating & Comment</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}