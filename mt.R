# mt
# TODO: scrape more meta tags such as og:...
#       collapse sequential regex procedures into a single operation! 
# String prefixes:
#   d_ dirty
#   t_ tidy
# ----------------------------------------------------------------------------
mt <- list()
# ----------------------------------------------------------------------------
# Reads meta information from webpages
#   @param {char} URI Vector of URIs to scan
#   @param {bool} titl Get title text
#   @param {bool} desc Get meta description text
#   @param {bool} keyw Get meta keywords text
#   @param {bool} schema Get schema.org JSON
# ----------------------------------------------------------------------------
mt$read <- function(URI=NULL, titl=T, desc=T, keyw=T, schema=T) {
  if (missing(URI)) stop('no input URI!')
  if (!any(titl, desc, keyw, schema)) stop('no output set!')
  data <- list()
  if (schema) {
    require(jsonlite)
    data$schema <- list()
  }
  data$meta <- matrix(sapply(URI, function(x) {
    rtn <- c(x)
    CON <- url(x)
    on.exit(close(CON))
    d_src <- paste(try(readLines(CON, warn=F)), collapse='')
    if (titl) {
      if(grepl('<title>.*</title>', d_src)) {
        t_titl <- gsub('.*<title>|</title>.*', '', d_src)
        rtn <- c(rtn, t_titl)
      } else { rtn <- c(rtn, NA) }
    }
    if (desc) {
      if (grepl('meta name=\"description\"', d_src)) {
        d_desc <- gsub('^.*(<meta name=\"description\"[^>]+>).*$', '\\1', d_src)
        t_desc <- gsub('^.*content=\"([^"]+)".*$', '\\1', d_desc)
        rtn <- c(rtn, t_desc)
      } else { rtn <- c(rtn, NA) }
    }
    if (keyw) {
      if (grepl('meta name=\"keywords\"', d_src)) {
        d_keyw <- gsub('^.*(<meta name=\"keywords\"[^>]+>).*$', '\\1', d_src)
        t_keyw <- gsub('^.*content=\"([^"]+)".*$', '\\1', d_keyw)
        rtn <- c(rtn, t_keyw)
      } else { rtn <- c(rtn, NA) }
    }
    if (schema) {  # binding schema json to a separate list outside sapply's scope
      if (grepl('<script type=\"application/ld\\+json\"', d_src)) {
        t_schm <- gsub('^.*<script type=\"application/ld\\+json\">([^<]+)</script>.*$', '\\1', d_src)
        data$schema[[x]] <<- fromJSON(t_schm)
      } else { data$schema[[x]] <<- NA }
    }
    return(rtn)
  }, USE.NAMES=F), ncol=sum(c(titl, desc, keyw))+1, byrow=T)
  colnames(data$meta) <- c('url', sapply(which(c(titl, desc, keyw), arr.ind=T), function(i) { c('title', 'description', 'keywords')[i] }))
  return(data)
}
