Rails.application.routes.draw do


  #----------usually useless above----------
  devise_for :users, controllers: { registrations: 'users/registrations' }
  root to: 'pages#home'
  get 'uikit', to: 'pages#uikit'
  get 'uikit_kid', to: 'pages#uikit_kid'
  get 'plans/tagged', to: "plans#tagged", as: :plans_tagged
  get 'kitchens/tagged', to: "kitchens#tagged", as: :kitchens_tagged

  # For details on the DSL available within this file, see http://guides.rubyonrails.org/routing.html

  resources :kitchens, only: [:index, :show, :new, :create, :edit, :update, :destroy] do
    resources :plans, only: [:new, :create]
    resources :dishes, only: [:new, :create]
  end

  resources :plans, only: [:index, :show, :edit, :update, :destroy] do
    resources :dish_plans, only: [:create]
    resources :orders, only: [:create]
  end

  resources :orders, only: [:index, :show, :edit, :update] do
    resources :payments, only: [:new, :create]
  end

  get 'my_account', to: 'users#edit'
  resources :users, only: [:update]
  resources :dish_plans, only: [:destroy]
  resources :locations, except:[:index, :show]

end
