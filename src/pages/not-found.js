// Entry for the site's not-found page (pages/404.html): the header, the message and the footer.
import '@src/styles/base.css'
import './not-found.css'
import { mountHeader } from '@src/lib/header.js'
import { mountFooterMark } from '@src/lib/footer-mark.js'
import { mountContact } from '@src/sections/contact/contact.js'

mountHeader()
mountFooterMark()
mountContact()
