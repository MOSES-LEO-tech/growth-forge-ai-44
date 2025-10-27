import { useNavigate } from 'react-router-dom';

/**
 * Custom hook that provides navigation functions
 * @returns Object containing navigation utility functions
 */
export const useNavigation = () => {
  const navigate = useNavigate();
  
  /**
   * Navigate to the home page
   */
  const goToHomePage = () => {
    navigate('/');
  };

  return {
    goToHomePage,
  };
};