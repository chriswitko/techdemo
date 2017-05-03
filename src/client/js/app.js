function getRandomInt (min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function loginModal () {
  $('.modal.show').removeClass('show')
  var modalSelector = 'ask-question'
  $('.modal-' + modalSelector + '').addClass('show')
}

$('.js-questions').on('click', '.js-follow', function (e) {
  var $this = $(this)
  var votes = $this.data('votes') === true
  var followId = $this.attr('data-id') || false

  // logged out modal
  if (!$this.parent().hasClass('signedin')) {
    $('.modal.show').removeClass('show')
    var modal = $('.modal-' + $this.attr('data-modal'))
    var voteTop = $this.offset().top - 12
    var voteLeft = $this.offset().left - 16
    modal.css({ top: voteTop, left: voteLeft })

    var numFollows = getRandomInt(0, 1)
    var modalTitle = ''
    var modalText = ''
    switch (numFollows) {
      case '0':
        modalTitle = 'Sign up to follow'
        modalText = 'Sign up to follow links and contribute to the Techspeller community.'
        break

      default:
        modalTitle = 'You seem to like what you see'
        modalText = 'Sign up to follow links and contribute to the Techspeller community.'
        break
    }

    $('#num_follows').val(parseInt(numFollows) + 1)

    modal.find('h5').text(modalTitle)
    modal.find('.modal-content p').text(modalText)

    modal.addClass('show')
    e.stopPropagation()
  }

  console.log('votes', votes)
  if (!$this.parent().hasClass('selected')) {
    $.post('/' + (votes ? 'follow' : 'approve') + '/' + followId, {
      link: followId
    }, function (response) {
      $this.parent().addClass('selected')
    })
  } else {
    $.post('/unfollow/' + followId, {
      link: followId
    }, function (response) {
      $this.parent().removeClass('selected')
    })
  }
})

$('.js-questions').on('click', '.js-delete', function (e) {
  var $this = $(this)
  var followId = $this.attr('data-id') || false
  e.preventDefault()

  if (confirm('Are you sure?')) {
    $.post('/delete/' + followId, {
      link: followId
    }, function (response) {
      $('#q-' + followId).remove()
    })
  }
})
// Handle scrolling
function isInView (elem) {
  return $(window).scrollTop() > $(elem).offset().top / 4
}

$(window).scroll(function () {
  if ($('.hand').hasClass('hand')) {
    if (isInView($('#bottom'))) {
      $('#questions').addClass('in-view')
    }
  }
})

// Submit a link
$('.js-submit').on('click', function (ev) {
  if ($('.ask-question-input').val().length < 5) {
  }
  ev.preventDefault()
  return
})

// Validate a form
$('.ask-question-input').keyup(function (k) {
  if ($(this).val().length >= 5) {
    $('.ask').addClass('valid')
  } else {
    $('.ask').removeClass('valid')
  }
})

$(function () {
  $('a[href*="#"]:not([href="#"])').click(function (e) {
    if (window.location.pathname.replace(/^\//, '') === this.pathname.replace(/^\//, '') && window.location.hostname === this.hostname) {
      var target = $(this.hash)
      target = target.length ? target : $('[name=' + this.hash.slice(1) + ']')
      if (target.length) {
        $('html, body').animate({
          scrollTop: target.offset().top
        }, 600)
        e.preventDefault()
      }
    }
  })
})

// click outside of modal to hide
$(window).click(function (e) {
  if (!$(e.target).parents('.modal.show').is('.modal.show') && $('.modal.show').length > 0) {
    $('.modal.show').removeClass('show')
  }
})

// press escape close modal
$(document).keyup(function (e) {
  if (e.keyCode === 27) {
    $('.modal.show').removeClass('show')
  }
})

$('.modal-activate').click(function (e) {
  $('.modal.show').removeClass('show')
  var modalSelector = $(this).attr('data-modal')
  $('.modal-' + modalSelector + '').addClass('show')
  e.stopPropagation()
})

$('.modal .close').click(function (e) {
  $(this).closest('.modal').removeClass('show')
  e.stopPropagation()
})

$('.modal').on('click', '.js-ask-another', function (e) {
  e.preventDefault()
  $(this).closest('.modal').removeClass('show')
  $('#question').focus()
})

$('body').on('click', '.js-facebook-share', function (e) {
  e.preventDefault()
  FB.ui({
    method: 'share',
    href: e.currentTarget.href
  }, function (response) {})
})
