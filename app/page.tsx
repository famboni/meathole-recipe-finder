'use client';

import { useState, useEffect } from 'react';
import { Heart, Plus, X, Shuffle, Loader2, Share2, Printer } from 'lucide-react';
import { supabase } from '../lib/supabase';
import Image from 'next/image';

type Recipe = {
  idMeal: string;
  strMeal: string;
  strMealThumb: string;
  strCategory?: string;
  strArea?: string;
  strInstructions?: string;
};

type FullRecipe = Recipe & {
  ingredients: string[];
  measures: string[];
};

type Rating = {
  id: string;
  recipe_id: string;
  username: string;
  rating: number;
  comment: string;
  created_at: string;
};

export default function MeatholeRecipeFinder() {
  const [ingredients, setIngredients] = useState<string[]>([]);
  const [currentIngredient, setCurrentIngredient] = useState('');
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchPerformed, setSearchPerformed] = useState(false);
  const [favorites, setFavorites] = useState<any[]>([]);
  const [selectedRecipe, setSelectedRecipe] = useState<FullRecipe | null>(null);
  const [activeTab, setActiveTab] = useState<'search' | 'favorites'>('search');
  
  const [ratings, setRatings] = useState<Record<string, Rating[]>>({});
  const [newRating, setNewRating] = useState(5);
  const [newComment, setNewComment] = useState('');
  const [username, setUsername] = useState('Anonymous Chef');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadFavorites();
    loadAllRatings();
  }, []);

  const loadFavorites = async () => {
    const { data } = await supabase.from('user_favorites').select('*').order('created_at', { ascending: false });
    setFavorites(data || []);
  };

  const loadAllRatings = async () => {
    const { data } = await supabase
      .from('recipe_ratings')
      .select('*')
      .order('created_at', { ascending: false });

    if (data) {
      const grouped = data.reduce((acc: Record<string, Rating[]>, rating: Rating) => {
        if (!acc[rating.recipe_id]) acc[rating.recipe_id] = [];
        acc[rating.recipe_id].push(rating);
        return acc;
      }, {});
      setRatings(grouped);
    }
  };

  const addIngredient = () => {
    const trimmed = currentIngredient.trim();
    if (trimmed && !ingredients.includes(trimmed)) {
      setIngredients([...ingredients, trimmed]);
      setCurrentIngredient('');
    }
  };

  const removeIngredient = (index: number) => {
    setIngredients(ingredients.filter((_, i) => i !== index));
  };

  const searchRecipes = async () => {
    if (ingredients.length === 0 && !searchQuery) return alert("Add at least one ingredient or search by name");
    setLoading(true);
    setSearchPerformed(true);

    try {
      let results: Recipe[] = [];

      if (searchQuery) {
        const res = await fetch(`https://www.themealdb.com/api/json/v1/1/search.php?s=${encodeURIComponent(searchQuery)}`);
        const data = await res.json();
        results = data.meals || [];
      } else {
        const res = await fetch(`https://www.themealdb.com/api/json/v1/1/filter.php?i=${ingredients[0]}`);
        const data = await res.json();
        let candidates = data.meals || [];

        if (ingredients.length > 1) {
          const detailedPromises = candidates.slice(0, 30).map((r: Recipe) =>
            fetch(`https://www.themealdb.com/api/json/v1/1/lookup.php?i=${r.idMeal}`).then(res => res.json())
          );

          const detailedResults = await Promise.all(detailedPromises);
          
          results = detailedResults
            .map(d => d.meals?.[0])
            .filter(Boolean)
            .filter(meal => {
              const mealIngredients = Object.keys(meal)
                .filter(key => key.startsWith('strIngredient') && meal[key])
                .map(key => meal[key].toLowerCase().trim());
              return ingredients.every(ing => 
                mealIngredients.some(mIng => mIng.includes(ing.toLowerCase().trim()))
              );
            });
        } else {
          results = candidates;
        }
      }

      setRecipes(results.slice(0, 18));
    } catch (error) {
      alert("Search failed. Please try again.");
    }
    setLoading(false);
  };

  const getRandomRecipe = async () => {
    setLoading(true);
    setSearchPerformed(true);
    const randomRecipes: Recipe[] = [];
    try {
      const promises = Array.from({ length: 20 }, () => fetch('https://www.themealdb.com/api/json/v1/1/random.php').then(res => res.json()));
      const results = await Promise.all(promises);
      results.forEach(result => {
        if (result.meals?.[0]) randomRecipes.push(result.meals[0]);
      });
      const unique = Array.from(new Map(randomRecipes.map(r => [r.idMeal, r])).values());
      setRecipes(unique.slice(0, 15));
    } catch (error) {
      alert("Couldn't load random recipes");
    }
    setLoading(false);
  };

  const openRecipe = async (recipeInput: any) => {
    const recipeId = recipeInput.idMeal || recipeInput.recipe_id;
    try {
      const res = await fetch(`https://www.themealdb.com/api/json/v1/1/lookup.php?i=${recipeId}`);
      const data = await res.json();
      const meal = data.meals[0];

      const ingredientsList: string[] = [];
      const measuresList: string[] = [];
      for (let i = 1; i <= 20; i++) {
        const ing = meal[`strIngredient${i}`];
        const measure = meal[`strMeasure${i}`];
        if (ing?.trim()) {
          ingredientsList.push(ing);
          measuresList.push(measure || '');
        }
      }
      setSelectedRecipe({ ...meal, ingredients: ingredientsList, measures: measuresList });
      setNewRating(5);
      setNewComment('');
    } catch (error) {
      alert("Failed to load recipe details");
    }
  };

  const toggleFavorite = async (recipe: any) => {
    const recipeId = recipe.idMeal || recipe.recipe_id;
    const isFavorite = favorites.some(f => f.recipe_id === recipeId);

    if (isFavorite) {
      await supabase.from('user_favorites').delete().eq('recipe_id', recipeId);
    } else {
      await supabase.from('user_favorites').insert({
        recipe_id: recipeId,
        recipe_name: recipe.strMeal || recipe.recipe_name,
        image_url: recipe.strMealThumb || recipe.image_url,
      });
    }
    loadFavorites();
  };

  const submitRating = async () => {
    if (!selectedRecipe || !newComment.trim()) {
      alert("Please write a comment");
      return;
    }

    const { error: ratingError } = await supabase.from('recipe_ratings').insert({
      recipe_id: selectedRecipe.idMeal,
      username: username.trim() || 'Anonymous Chef',
      rating: newRating,
      comment: newComment.trim(),
    });

    if (ratingError) {
      alert(`Failed to save rating: ${ratingError.message}`);
      return;
    }

    const recipeId = selectedRecipe.idMeal;
    const isAlreadyFavorite = favorites.some(f => f.recipe_id === recipeId);
    if (!isAlreadyFavorite) {
      await supabase.from('user_favorites').insert({
        recipe_id: recipeId,
        recipe_name: selectedRecipe.strMeal,
        image_url: selectedRecipe.strMealThumb,
      });
    }

    await loadAllRatings();
    await loadFavorites();

    setNewComment('');
    alert("✅ Rating saved and added to Favorites!");
  };

  const shareRecipe = () => {
    const url = "https://famboni-meathole-recipe-finder.vercel.app/";
    if (navigator.share) {
      navigator.share({
        title: selectedRecipe?.strMeal || "Tony's Meathole Recipe",
        text: "Check out this delicious recipe!",
        url: url,
      });
    } else {
      navigator.clipboard.writeText(url);
      alert("Link copied to clipboard!");
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-orange-950 via-red-950 to-amber-950 text-white pb-20">
      <div className="max-w-7xl mx-auto p-4 md:p-6">
        {/* Centered Header */}
        <div className="flex flex-col items-center mb-10">
          <div className="flex items-center gap-4">
            <Image src="/icon-192.png" alt="Logo" width={70} height={70} className="rounded-2xl" />
            <div className="text-center">
              <h1 className="text-5xl md:text-6xl font-black text-orange-400 tracking-tighter">TONY'S MEATHOLE</h1>
              <p className="text-xl md:text-2xl text-orange-200">Recipe Finder</p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex justify-center mb-10">
          <div className="bg-zinc-900 rounded-3xl p-1 flex">
            <button 
              onClick={() => setActiveTab('search')} 
              className={`px-10 py-3.5 rounded-3xl font-medium transition-all ${activeTab === 'search' ? 'bg-orange-600' : 'hover:bg-zinc-800'}`}
            >
              🔍 Search
            </button>
            <button 
              onClick={() => setActiveTab('favorites')} 
              className={`px-10 py-3.5 rounded-3xl font-medium transition-all ${activeTab === 'favorites' ? 'bg-orange-600' : 'hover:bg-zinc-800'}`}
            >
              ❤️ Favorites
            </button>
          </div>
        </div>

        {/* Search Tab */}
        {activeTab === 'search' && (
          <div className="max-w-2xl mx-auto mb-12">
            <div className="bg-zinc-900 border border-orange-900 rounded-3xl p-8">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search recipe name..."
                className="w-full bg-zinc-800 border border-orange-800 rounded-2xl px-6 py-4 mb-6"
              />

              <input
                type="text"
                value={currentIngredient}
                onChange={(e) => setCurrentIngredient(e.target.value)}
                placeholder="Add ingredient..."
                className="w-full bg-zinc-800 border border-orange-800 rounded-2xl px-6 py-4 mb-4"
                onKeyDown={(e) => e.key === 'Enter' && addIngredient()}
              />

              <button onClick={addIngredient} className="w-full bg-orange-600 py-4 rounded-2xl font-semibold mb-6">+ Add Ingredient</button>

              <div className="flex flex-wrap gap-3 mb-8">
                {ingredients.map((ing, i) => (
                  <div key={i} className="bg-orange-900 px-5 py-2 rounded-2xl flex items-center gap-2">
                    {ing}
                    <X size={18} className="cursor-pointer hover:text-red-400" onClick={() => removeIngredient(i)} />
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <button onClick={searchRecipes} disabled={loading} className="bg-orange-600 py-4 rounded-2xl font-semibold disabled:opacity-70 flex items-center justify-center">
                  {loading ? <Loader2 className="animate-spin" /> : 'Search Recipes'}
                </button>
                <button onClick={getRandomRecipe} disabled={loading} className="bg-zinc-800 py-4 rounded-2xl font-semibold flex items-center justify-center gap-2">
                  <Shuffle /> Random
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Recipe Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {(activeTab === 'search' ? recipes : favorites).map((recipe: any) => (
            <div
              key={recipe.idMeal || recipe.recipe_id}
              onClick={() => openRecipe(recipe)}
              className="bg-zinc-900 border border-orange-900 rounded-3xl overflow-hidden cursor-pointer hover:border-orange-500 transition-all"
            >
              <img src={recipe.strMealThumb || recipe.image_url} alt={recipe.strMeal || recipe.recipe_name} className="w-full h-52 object-cover" />
              <div className="p-5">
                <div className="flex justify-between items-start">
                  <h3 className="font-semibold pr-2 line-clamp-2">{recipe.strMeal || recipe.recipe_name}</h3>
                  <button onClick={(e) => { e.stopPropagation(); toggleFavorite(recipe); }} className="text-orange-400">
                    <Heart fill={favorites.some(f => f.recipe_id === (recipe.idMeal || recipe.recipe_id)) ? "currentColor" : "none"} size={24} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Empty States */}
        {activeTab === 'search' && searchPerformed && recipes.length === 0 && (
          <p className="text-center text-orange-300 py-20 text-xl">No recipes found 😔</p>
        )}
        {activeTab === 'favorites' && favorites.length === 0 && (
          <p className="text-center text-orange-300 py-20 text-xl">No favorites yet. Heart some recipes!</p>
        )}
      </div>

      {/* Modal */}
      {selectedRecipe && (
        <div className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center p-4 print:bg-white">
          <div className="bg-zinc-900 border border-orange-800 rounded-3xl w-full max-w-4xl max-h-[95vh] overflow-auto print:bg-white print:border-none">
            <div className="sticky top-0 bg-zinc-900 p-6 border-b border-orange-800 flex justify-between items-center print:sticky print:top-0 print:bg-white print:text-black">
              <h2 className="text-2xl font-bold print:text-3xl">{selectedRecipe.strMeal}</h2>
              <div className="flex items-center gap-6 print:hidden">
                <button onClick={shareRecipe} className="text-3xl"><Share2 /></button>
                <button onClick={() => window.print()} className="text-3xl"><Printer /></button>
                <button onClick={() => setSelectedRecipe(null)} className="text-4xl text-zinc-400 hover:text-white">×</button>
              </div>
            </div>

            <div className="p-6 md:p-8 print:p-8 print:text-black">
              <img src={selectedRecipe.strMealThumb} alt={selectedRecipe.strMeal} className="w-full rounded-2xl mb-8 print:max-w-lg print:mx-auto" />

              <h3 className="text-xl font-semibold mb-4 text-orange-400 print:text-black">Ingredients</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-12">
                {selectedRecipe.ingredients.map((ing, i) => (
                  <div key={i} className="bg-zinc-800 p-4 rounded-2xl flex gap-3 print:bg-white print:border print:border-gray-300">
                    <span className="text-orange-400 print:text-black">•</span>
                    <span>{selectedRecipe.measures[i]} {ing}</span>
                  </div>
                ))}
              </div>

              <h3 className="text-xl font-semibold mb-6 text-orange-400 print:text-black">Instructions</h3>
              <div className="space-y-6 mb-12">
                {selectedRecipe.strInstructions?.split('. ').filter(Boolean).map((step, index) => (
                  <p key={index} className="bg-zinc-800 p-5 rounded-2xl leading-relaxed print:bg-white print:border print:border-gray-300 print:p-6">
                    {step}.
                  </p>
                ))}
              </div>

              {/* Previous Reviews */}
              <div className="mb-12 print:hidden">
                <h3 className="text-xl font-semibold mb-6 text-orange-400">
                  Previous Reviews ({ratings[selectedRecipe.idMeal]?.length || 0})
                </h3>
                {ratings[selectedRecipe.idMeal] && ratings[selectedRecipe.idMeal].length > 0 ? (
                  <div className="space-y-6">
                    {ratings[selectedRecipe.idMeal].map((review) => (
                      <div key={review.id} className="bg-zinc-800 p-6 rounded-2xl">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <span className="font-semibold">{review.username}</span>
                            <span className="ml-3 text-orange-400">⭐ {review.rating}/10</span>
                          </div>
                          <span className="text-sm text-zinc-400">
                            {new Date(review.created_at).toLocaleDateString()} at{' '}
                            {new Date(review.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <p className="text-zinc-300 leading-relaxed">{review.comment}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-zinc-400 italic">No reviews yet. Be the first!</p>
                )}
              </div>

              {/* Rate Form */}
              <div className="border-t border-orange-900 pt-8 print:hidden">
                <h3 className="text-xl font-semibold mb-6">Rate this Recipe</h3>
                <div className="bg-zinc-800 p-6 rounded-3xl">
                  <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Your name" className="w-full bg-zinc-900 border border-orange-800 rounded-2xl px-5 py-3 mb-4" />
                  <div className="flex items-center gap-4 mb-4">
                    <span>Rating:</span>
                    <input type="range" min="1" max="10" value={newRating} onChange={(e) => setNewRating(Number(e.target.value))} className="flex-1 accent-orange-500" />
                    <span className="font-bold text-xl w-12 text-orange-400">{newRating}/10</span>
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