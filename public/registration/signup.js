const form =document.getElementById("signupForm")
const emailInput =document.getElementById("email")
const phoneInput =document.getElementById("phone")
const passInput =document.getElementById("password")
const confirmPass =document.getElementById("confirmPass")
const nameInput =document.getElementById("name")

const nameMessage =document.getElementById("nameMessage")
const emailMessage =document.getElementById("emailMessage")
const phoneMessage =document.getElementById("phoneMessage")
const passMessage =document.getElementById("passMessage")
const confirmMessage =document.getElementById("confirmMessage")



form.addEventListener("submit",(e)=>{
    let emailCheck = /^([A-Za-z0-9_\-\.])+\@([A-Za-z0-9_\-\.])+\.([A-Za-z]{2,4})$/

    if(nameInput.value.length< 4){
        e.preventDefault()
        nameMessage.innerHTML = "Name must be at least 4 characters "
    
    }
    if(!emailInput.value.match(emailCheck)){
        e.preventDefault();
       emailMessage.innerHTML = "valid email is requied";
    }
    if(phoneInput.value.length < 10 || isNaN(phoneInput.value)){
        e.preventDefault()
        phoneMessage.innerHTML =" invalid phone number "
    }
    if(passInput.value.length < 6){
        e.preventDefault();
        passMessage.innerHTML =" password must be atleast 6 character"
    }
    if(confirmPass.value !==passInput.value){
        e.preventDefault()
        confirmMessage.innerHTML = "password do not match"
    }
    
})