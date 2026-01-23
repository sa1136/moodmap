import React from 'react';

interface FiltersProps {
  onFilterChange: (filters: FilterState) => void;
  currentFilters: FilterState;
}

export interface FilterState {
  rating: string;
  price: string;
  activityType: string;
}

const Filters: React.FC<FiltersProps> = ({ onFilterChange, currentFilters }) => {
  const handleChange = (key: keyof FilterState, value: string) => {
    onFilterChange({
      ...currentFilters,
      [key]: value
    });
  };

  return (
    <div 
      className="bg-slate-800 p-5 mb-6 text-white"
      style={{
        borderRadius: '20px 8px 18px 6px',
        border: '4px solid #1a1a1a',
        boxShadow: '6px 6px 0px rgba(0, 0, 0, 0.3)',
        fontFamily: "'Inter', sans-serif"
      }}
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-2xl font-bold text-white" style={{ fontFamily: "'Poppins', sans-serif" }}>🔍 Filters</h3>
        <button
          onClick={() => onFilterChange({ rating: '', price: '', activityType: '' })}
          className="doodle-button text-sm bg-slate-700 text-white font-semibold px-3 py-1"
          style={{ fontFamily: "'Inter', sans-serif" }}
        >
          Clear All
        </button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Rating Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Min Rating</label>
          <select
            value={currentFilters.rating}
            onChange={(e) => handleChange('rating', e.target.value)}
            className="doodle-input w-full px-3 py-2 font-medium text-sm bg-slate-700 text-white border-slate-900"
            style={{ fontFamily: "'Inter', sans-serif" }}
          >
            <option value="">Any rating</option>
            <option value="4.5">4.5+ ⭐</option>
            <option value="4.0">4.0+ ⭐</option>
            <option value="3.5">3.5+ ⭐</option>
            <option value="3.0">3.0+ ⭐</option>
          </select>
        </div>

        {/* Price Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Price Range</label>
          <select
            value={currentFilters.price}
            onChange={(e) => handleChange('price', e.target.value)}
            className="doodle-input w-full px-3 py-2 font-medium text-sm bg-slate-700 text-white border-slate-900"
            style={{ fontFamily: "'Inter', sans-serif" }}
          >
            <option value="">Any price</option>
            <option value="$">$ - Budget</option>
            <option value="$$">$$ - Moderate</option>
            <option value="$$$">$$$ - Expensive</option>
            <option value="Free">Free</option>
          </select>
        </div>

        {/* Activity Type Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Activity Type</label>
          <select
            value={currentFilters.activityType}
            onChange={(e) => handleChange('activityType', e.target.value)}
            className="doodle-input w-full px-3 py-2 font-medium text-sm bg-slate-700 text-white border-slate-900"
            style={{ fontFamily: "'Inter', sans-serif" }}
          >
            <option value="">All types</option>
            <option value="restaurant">Restaurant</option>
            <option value="cafe">Cafe</option>
            <option value="park">Park</option>
            <option value="gym">Gym</option>
            <option value="museum">Museum</option>
            <option value="entertainment">Entertainment</option>
            <option value="spa">Spa</option>
            <option value="library">Library</option>
          </select>
        </div>
      </div>
    </div>
  );
};

export default Filters;
