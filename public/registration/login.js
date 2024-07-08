
function validateForm() {
  
  const emailInput = document.getElementById("email");
  const passInput = document.getElementById("pass");
  const emailMessage = document.getElementById("emailMessage");
  const passMessage = document.getElementById("passMessage");

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(emailInput.value)) {
    emailMessage.textContent = "Invalid email address";
    return false; 
  } else {
    emailMessage.textContent = ""; 
  }



  if (passInput.value.length < 6) {
    passMessage.textContent = "Password must be at least 8 characters long";
    return false;
  } else {
    passMessage.textContent = "";
  }

  return true;
}