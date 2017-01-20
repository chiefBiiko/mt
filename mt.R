# mt
# ----------------------------------------------------------------------------
mt <- list()
# ----------------------------------------------------------------------------
# Reads meta information from webpages
# @param {char} URI Vector of URIs to scan
# @param {bool} titl Get title text
# @param {bool} desc Get meta description text
# @param {bool} keyw Get meta keywords text
# @param {bool} schema Get schema.org JSON
# @return {list} $meta of class matrix, and if schema==T $schema of class list 
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
    d_src <- paste0(try(readLines(CON, warn=F)), collapse='')
    if (titl) {
      if (grepl('<title>.*</title>', d_src)) {
        rtn <- c(rtn, gsub('.*<title>|</title>.*', '', d_src))
      } else { rtn <- c(rtn, NA) }
    }
    if (desc) {
      if (grepl('meta name=\"description\"', d_src)) {
        rtn <- c(rtn, gsub('^.*<meta[^"]+name=\"description\"[^"]+content=\"([^"]+)".+$', '\\1', d_src))
      } else { rtn <- c(rtn, NA) }
    }
    if (keyw) {
      if (grepl('meta name=\"keywords\"', d_src)) {
        rtn <- c(rtn, gsub('^.*<meta[^"]+name=\"keywords\"[^"]+content=\"([^"]+)".+$', '\\1', d_src))
      } else { rtn <- c(rtn, NA) }
    }
    if (schema) {  # binding schema json to a separate list outside sapply's scope
      if (grepl('<script type=\"application/ld\\+json\"', d_src)) {
        data$schema[[x]] <<- fromJSON(gsub('^.*<script type=\"application/ld\\+json\">([^<]+)</script>.*$', '\\1', d_src))
      } else { data$schema[[x]] <<- NA }
    }
    return(rtn)
  }, USE.NAMES=F), ncol=sum(c(titl, desc, keyw))+1, byrow=T)
  colnames(data$meta) <- c('url', sapply(which(c(titl, desc, keyw), arr.ind=T), function(i) { c('title', 'description', 'keywords')[i] }))
  return(data)
}
