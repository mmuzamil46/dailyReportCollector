import { useState, useEffect } from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';
import './Home.css'; // We'll create this CSS file

function Home() {
  // Image slides data
  const slides = [
    {
      id: 1,
      image: '/slide-1.jpg',
      title: 'እንኳን ደህና መጡ!!',
      description: 'የአዲስ ከተማ ክፍለ ከተማ ሲቪል ምዝገባ እና የነዋሪነት አገልግሎት ጽህፈት ቤት',
      overlayColor: 'rgba(0, 51, 102, 0.7)' // Dark blue overlay
    },
    {
      id: 2,
      image: '/slide-2.jpg',
      title: 'ሲቪል ምዝገባ አገልግሎት',
      description: 'ውጤታማ እና ፈጣን የምዝገባ አገልግሎቶች',
      overlayColor: 'rgba(0, 102, 51, 0.7)' // Green overlay
    },
    {
      id: 3,
      image: '/slide-3.jpg',
      title: 'የነዋሪነት አገልግሎት',
      description: 'ለአዲስ ነዋሪዎች ሙሉ የመረጃ አገልግሎት',
      overlayColor: 'rgba(102, 0, 51, 0.7)' // Purple overlay
    }
  ];

  const [currentSlide, setCurrentSlide] = useState(0);

  // Auto-slide functionality
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 5000); // Change slide every 5 seconds

    return () => clearInterval(interval);
  }, [slides.length]);

  // Manual slide navigation
  const goToSlide = (index) => {
    setCurrentSlide(index);
  };

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % slides.length);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length);
  };

  return (
    <div className="home-container">
      {/* Image Slider */}
      <div className="slider-container">
        {slides.map((slide, index) => (
          <div
            key={slide.id}
            className={`slide ${index === currentSlide ? 'active' : ''}`}
            style={{
              backgroundImage: `linear-gradient(${slide.overlayColor}, ${slide.overlayColor}), url(${slide.image})`
            }}
          >
            <div className="slide-content">
              <h1 className="slide-title animate-title">{slide.title}</h1>
              <p className="slide-description animate-description">{slide.description}</p>
              
              {/* Call to Action Button */}
              <div className="cta-buttons animate-buttons">
                <button className="btn btn-primary btn-lg mx-2">
                  አገልግሎቶቻችንን ይመልከቱ
                </button>
                <button className="btn btn-outline-light btn-lg mx-2">
                  ተጨማሪ መረጃ
                </button>
              </div>
            </div>
          </div>
        ))}

        {/* Navigation Arrows */}
        <button className="slider-nav prev" onClick={prevSlide}>
          ❮
        </button>
        <button className="slider-nav next" onClick={nextSlide}>
          ❯
        </button>

        {/* Slide Indicators */}
        <div className="slide-indicators">
          {slides.map((_, index) => (
            <button
              key={index}
              className={`indicator ${index === currentSlide ? 'active' : ''}`}
              onClick={() => goToSlide(index)}
            />
          ))}
        </div>
      </div>

     
    </div>
  );
}

export default Home;