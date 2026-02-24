
/** show menu */

document.addEventListener("DOMContentLoaded", function() {

/** Hide and show toogles */

  // Navigation toogles
  const menuBtn = document.querySelector(".nav-btn");
  const navLinks = document.querySelector(".nav__list");

  //on click event
  menuBtn.addEventListener("click", function() {
    navLinks.classList.toggle("nav__list-show");
    navLinks.classList.toggle("nav__list-hidden");
    
  });

  // Sidebar toogles
  const sideBtn = document.querySelector(".side-nav__icon");
  const navSide = document.querySelector(".nav-sidebar");

  // on click event
  sideBtn.addEventListener("click", function() {
    navSide.classList.toggle("nav-sidebar-show");
    navSide.classList.toggle("nav-sidebar-hidden");
    
  });

    /** List Items 

    let listCollapse = document.getElementById('btnClick');
    let listItems = document.getElementById('items-list');
    let pageContent = document.getElementById('page-content');
   
    listCollapse.addEventListener('click', function() {
      pageContent.classList.toggle('show-listItems');
     
    });*/


    /** Dropdown Toogles */

    let dropdownButton = document.querySelector('.dropdown-btn');
    let dropdownContent = document.querySelector('.dropdown-content');
    let dropdownParent = document.querySelector('.dropdown');
  
    dropdownButton.addEventListener('click', function() {
      dropdownParent.classList.toggle('show');
      
      
      /* get the item properties
      let dropdownRect = dropdownContent.getBoundingClientRect();
      // get the viewport of window width and height
      let viewportWidth = window.innerWidth;
      let viewportHeight = window.innerHeight;
      
      const dropdownWidth = dropdownRect.x + dropdownRect.width;
      const x = dropdownRect.x + dropdownRect.width;

      console.log("x " + dropdownRect.x );
      console.log("width " + dropdownRect.width );
      console.log(" Current " + viewportWidth );

      console.log("test " + dropdownRect.left+dropdownRect.width );
      
      // check if toches the window if yes perform calculation
      if ( dropdownWidth > viewportWidth) {
        // get the left

        console.log(dropdownWidth);
        console.log(dropdownRect.left);
        const final = dropdownRect.width + ((dropdownRect.left - dropdownWidth) + (dropdownWidth - viewportWidth));
        console.log(final);
        dropdownContent.style.left = final + ((dropdownRect.left - dropdownWidth) + (dropdownWidth - viewportWidth)) + 'px';
        console.log( final + ((dropdownRect.left - dropdownWidth) + (dropdownWidth - viewportWidth)) + 'px');

        
      }
      /** */
      
      
    });

    /**Prism */

  
 
});




