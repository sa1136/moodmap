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
      className="bg-white p-5 mb-6 border border-gray-200"
      style={{
        borderRadius: '16px',
        fontFamily: "'Inter', sans-serif"
      }}
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl sm:text-2xl font-bold text-gray-900" style={{ fontFamily: "'Poppins', sans-serif" }}>🔍 Filters</h3>
        <button
          onClick={() => onFilterChange({ rating: '', price: '', activityType: '' })}
          className="doodle-button text-xs sm:text-sm bg-gray-100 text-gray-700 font-semibold px-2 sm:px-3 py-1 hover:bg-gray-200"
          style={{ fontFamily: "'Inter', sans-serif" }}
        >
          Clear
        </button>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        {/* Rating Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Min Rating</label>
          <select
            value={currentFilters.rating}
            onChange={(e) => handleChange('rating', e.target.value)}
            className="w-full px-3 py-2 font-medium text-sm bg-white text-gray-900 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
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
          <label className="block text-sm font-medium text-gray-700 mb-2">Price Range</label>
          <select
            value={currentFilters.price}
            onChange={(e) => handleChange('price', e.target.value)}
            className="w-full px-3 py-2 font-medium text-sm bg-white text-gray-900 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
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
          <label className="block text-sm font-medium text-gray-700 mb-2">Activity Type</label>
          <select
            value={currentFilters.activityType}
            onChange={(e) => handleChange('activityType', e.target.value)}
            className="w-full px-3 py-2 font-medium text-sm bg-white text-gray-900 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
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
